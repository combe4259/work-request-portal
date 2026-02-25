package org.example.domain.activityLog.service;

import org.example.domain.activityLog.dto.ActivityLogListResponse;
import org.example.domain.activityLog.entity.ActivityLog;
import org.example.domain.activityLog.repository.ActivityLogRepository;
import org.example.global.team.TeamScopeUtil;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;
import java.util.Set;

@Service
@Transactional(readOnly = true)
public class ActivityLogServiceImpl implements ActivityLogService {

    private static final Set<String> ALLOWED_REF_TYPES = Set.of(
            "WORK_REQUEST",
            "TECH_TASK",
            "TEST_SCENARIO",
            "DEFECT",
            "DEPLOYMENT",
            "MEETING_NOTE",
            "PROJECT_IDEA",
            "KNOWLEDGE_BASE"
    );

    private final ActivityLogRepository activityLogRepository;

    public ActivityLogServiceImpl(ActivityLogRepository activityLogRepository) {
        this.activityLogRepository = activityLogRepository;
    }

    @Override
    public Page<ActivityLogListResponse> findPage(String refType, Long refId, int page, int size) {
        String normalizedRefType = normalizeRefType(refType);
        if (refId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "refId는 필수입니다.");
        }

        Long teamId = TeamScopeUtil.requireTeamId(null);
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);

        PageRequest pageable = PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "id"));
        return activityLogRepository.findByTeamIdAndRefTypeAndRefIdOrderByIdDesc(teamId, normalizedRefType, refId, pageable)
                .map(this::toListResponse);
    }

    @Override
    @Transactional
    public void record(ActivityLogCreateCommand command) {
        if (command == null) {
            return;
        }
        if (command.teamId() == null || command.refId() == null || isBlank(command.refType()) || isBlank(command.actionType())) {
            return;
        }

        ActivityLog entity = new ActivityLog();
        entity.setTeamId(command.teamId());
        entity.setRefType(normalizeRefType(command.refType()));
        entity.setRefId(command.refId());
        entity.setActionType(command.actionType().trim());
        entity.setActorId(command.actorId());
        entity.setFieldName(normalizeNullable(command.fieldName()));
        entity.setBeforeValue(normalizeNullable(command.beforeValue()));
        entity.setAfterValue(normalizeNullable(command.afterValue()));
        entity.setMessage(normalizeNullable(command.message()));

        activityLogRepository.save(entity);
    }

    private ActivityLogListResponse toListResponse(ActivityLog entity) {
        return new ActivityLogListResponse(
                entity.getId(),
                entity.getRefType(),
                entity.getRefId(),
                entity.getActionType(),
                entity.getActorId(),
                entity.getFieldName(),
                entity.getBeforeValue(),
                entity.getAfterValue(),
                entity.getMessage(),
                entity.getCreatedAt()
        );
    }

    private String normalizeRefType(String value) {
        if (isBlank(value)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "refType은 필수입니다.");
        }

        String normalized = value.trim().toUpperCase(Locale.ROOT);
        if (!ALLOWED_REF_TYPES.contains(normalized)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "유효하지 않은 refType입니다.");
        }
        return normalized;
    }

    private String normalizeNullable(String value) {
        if (isBlank(value)) {
            return null;
        }
        return value.trim();
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
