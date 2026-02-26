package org.example.domain.defect.service;

import org.example.domain.activityLog.service.ActivityLogCreateCommand;
import org.example.domain.activityLog.service.ActivityLogService;
import org.example.domain.defect.dto.DefectCreateRequest;
import org.example.domain.defect.dto.DefectDetailResponse;
import org.example.domain.defect.dto.DefectListQuery;
import org.example.domain.defect.dto.DefectListResponse;
import org.example.domain.defect.dto.DefectStatusUpdateRequest;
import org.example.domain.defect.dto.DefectUpdateRequest;
import org.example.domain.defect.entity.Defect;
import org.example.domain.defect.mapper.DefectMapper;
import org.example.domain.defect.repository.DefectRepository;
import org.example.domain.documentIndex.service.DocumentIndexSyncService;
import org.example.domain.notification.service.NotificationEventService;
import org.example.global.team.TeamRequestContext;
import org.example.global.team.TeamScopeUtil;
import org.example.global.util.DocumentNoGenerator;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.Locale;

@Service
@Transactional(readOnly = true)
public class DefectServiceImpl implements DefectService {

    private static final String REF_TYPE_DEFECT = "DEFECT";
    private static final String DEFECT_NOT_FOUND_MESSAGE = "결함을 찾을 수 없습니다.";

    private final DefectRepository defectRepository;
    private final DocumentNoGenerator documentNoGenerator;
    private final NotificationEventService notificationEventService;
    private final DocumentIndexSyncService documentIndexSyncService;
    private final ActivityLogService activityLogService;

    public DefectServiceImpl(
            DefectRepository defectRepository,
            DocumentNoGenerator documentNoGenerator,
            NotificationEventService notificationEventService,
            DocumentIndexSyncService documentIndexSyncService,
            @Nullable ActivityLogService activityLogService
    ) {
        this.defectRepository = defectRepository;
        this.documentNoGenerator = documentNoGenerator;
        this.notificationEventService = notificationEventService;
        this.documentIndexSyncService = documentIndexSyncService;
        this.activityLogService = activityLogService;
    }

    @Override
    public Page<DefectListResponse> findPage(int page, int size, DefectListQuery query) {
        PageRequest pageable = PageRequest.of(page, size, resolveSort(query));
        Long teamId = TeamScopeUtil.currentTeamId();

        Specification<Defect> spec = Specification.where(byTeamId(teamId))
                .and(byKeyword(query == null ? null : query.q()))
                .and(byExact("type", query == null ? null : query.type()))
                .and(byExact("severity", query == null ? null : query.severity()))
                .and(byExact("status", query == null ? null : query.status()))
                .and(byAssigneeId(query == null ? null : query.assigneeId()))
                .and(byDeadlineFrom(query == null ? null : query.deadlineFrom()))
                .and(byDeadlineTo(query == null ? null : query.deadlineTo()));

        return defectRepository.findAll(spec, pageable).map(DefectMapper::toListResponse);
    }

    @Override
    public DefectDetailResponse findById(Long id) {
        Defect entity = defectRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, DEFECT_NOT_FOUND_MESSAGE));
        TeamScopeUtil.ensureAccessible(entity.getTeamId());
        return DefectMapper.toDetailResponse(entity);
    }

    @Override
    @Transactional
    public Long create(DefectCreateRequest request) {
        validateCreateRequest(request);

        Defect entity = DefectMapper.fromCreateRequest(request);

        entity.setDefectNo(documentNoGenerator.next("DF"));
        entity.setTeamId(TeamScopeUtil.requireTeamId(request.teamId()));
        entity.setType(defaultIfBlank(request.type(), "기능"));
        entity.setSeverity(defaultIfBlank(request.severity(), "보통"));
        entity.setStatus(defaultIfBlank(request.status(), "접수"));
        entity.setReproductionSteps(defaultIfBlank(request.reproductionSteps(), "[]"));
        normalizeRelatedRef(entity, request.relatedRefType(), request.relatedRefId());

        Defect saved = defectRepository.save(entity);
        syncDocumentIndex(saved);
        recordCreated(saved);
        notifyAssigneeAssigned(saved);
        return saved.getId();
    }

    @Override
    @Transactional
    public void update(Long id, DefectUpdateRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "요청 본문이 비어 있습니다.");
        }

        Defect entity = defectRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, DEFECT_NOT_FOUND_MESSAGE));
        TeamScopeUtil.ensureAccessible(entity.getTeamId());
        Long previousAssigneeId = entity.getAssigneeId();
        String previousStatus = entity.getStatus();

        if (request.title() != null && request.title().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "title은 필수입니다.");
        }

        DefectMapper.applyUpdate(entity, request);

        if (request.type() != null) {
            entity.setType(defaultIfBlank(request.type(), entity.getType()));
        }
        if (request.severity() != null) {
            entity.setSeverity(defaultIfBlank(request.severity(), entity.getSeverity()));
        }
        if (request.status() != null) {
            entity.setStatus(defaultIfBlank(request.status(), entity.getStatus()));
        }
        if (request.reproductionSteps() != null) {
            entity.setReproductionSteps(defaultIfBlank(request.reproductionSteps(), "[]"));
        }
        if (request.relatedRefType() != null || request.relatedRefId() != null) {
            normalizeRelatedRef(entity, request.relatedRefType(), request.relatedRefId());
        }
        syncDocumentIndex(entity);
        recordUpdated(entity);
        recordAssigneeChanged(entity, previousAssigneeId);
        recordStatusChanged(entity, previousStatus);

        notifyAssigneeChanged(entity, previousAssigneeId);
        notifyStatusChanged(entity, previousStatus);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        Defect entity = defectRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, DEFECT_NOT_FOUND_MESSAGE));
        TeamScopeUtil.ensureAccessible(entity.getTeamId());

        recordDeleted(entity);
        defectRepository.delete(entity);
        deleteDocumentIndex(entity);
    }

    @Override
    @Transactional
    public void updateStatus(Long id, DefectStatusUpdateRequest request) {
        if (request == null || request.status() == null || request.status().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "status는 필수입니다.");
        }

        Defect entity = defectRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, DEFECT_NOT_FOUND_MESSAGE));
        TeamScopeUtil.ensureAccessible(entity.getTeamId());
        String previousStatus = entity.getStatus();

        entity.setStatus(request.status().trim());
        if (request.statusNote() != null) {
            entity.setStatusNote(normalizeNullable(request.statusNote()));
        }
        syncDocumentIndex(entity);
        recordStatusChanged(entity, previousStatus);

        notifyStatusChanged(entity, previousStatus);
    }

    private void validateCreateRequest(DefectCreateRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "요청 본문이 비어 있습니다.");
        }
        if (request.title() == null || request.title().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "title은 필수입니다.");
        }
        TeamScopeUtil.requireTeamId(request.teamId());
        if (request.reporterId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "reporterId는 필수입니다.");
        }
        if (request.expectedBehavior() == null || request.expectedBehavior().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "expectedBehavior는 필수입니다.");
        }
        if (request.actualBehavior() == null || request.actualBehavior().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "actualBehavior는 필수입니다.");
        }
        if (request.deadline() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "deadline은 필수입니다.");
        }

        if (request.relatedRefType() != null || request.relatedRefId() != null) {
            normalizeRelatedRef(new Defect(), request.relatedRefType(), request.relatedRefId());
        }
    }

    private void normalizeRelatedRef(Defect entity, String relatedRefType, Long relatedRefId) {
        if (relatedRefType == null || relatedRefType.isBlank()) {
            entity.setRelatedRefType(null);
            entity.setRelatedRefId(null);
            return;
        }

        if (relatedRefId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "relatedRefId는 필수입니다.");
        }

        String normalizedRefType = relatedRefType.trim().toUpperCase(Locale.ROOT);
        if (!normalizedRefType.equals("WORK_REQUEST")
                && !normalizedRefType.equals("TECH_TASK")
                && !normalizedRefType.equals("TEST_SCENARIO")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "유효하지 않은 relatedRefType입니다.");
        }

        entity.setRelatedRefType(normalizedRefType);
        entity.setRelatedRefId(relatedRefId);
    }

    private String defaultIfBlank(String value, String defaultValue) {
        if (value == null || value.isBlank()) {
            return defaultValue;
        }
        return value.trim();
    }

    private String normalizeNullable(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private Specification<Defect> byTeamId(Long teamId) {
        if (teamId == null) {
            return null;
        }
        return (root, query, builder) -> builder.equal(root.get("teamId"), teamId);
    }

    private Specification<Defect> byKeyword(String rawKeyword) {
        String keyword = normalizeNullable(rawKeyword);
        if (keyword == null) {
            return null;
        }

        return (root, query, builder) -> {
            String likeKeyword = "%" + keyword.toLowerCase(Locale.ROOT) + "%";
            return builder.or(
                    builder.like(builder.lower(root.get("title")), likeKeyword),
                    builder.like(builder.lower(root.get("defectNo")), likeKeyword)
            );
        };
    }

    private Specification<Defect> byExact(String column, String rawValue) {
        String value = normalizeNullable(rawValue);
        if (value == null) {
            return null;
        }
        return (root, query, builder) -> builder.equal(root.get(column), value);
    }

    private Specification<Defect> byAssigneeId(Long assigneeId) {
        if (assigneeId == null) {
            return null;
        }
        return (root, query, builder) -> builder.equal(root.get("assigneeId"), assigneeId);
    }

    private Specification<Defect> byDeadlineFrom(LocalDate deadlineFrom) {
        if (deadlineFrom == null) {
            return null;
        }
        return (root, query, builder) -> builder.greaterThanOrEqualTo(root.get("deadline"), deadlineFrom);
    }

    private Specification<Defect> byDeadlineTo(LocalDate deadlineTo) {
        if (deadlineTo == null) {
            return null;
        }
        return (root, query, builder) -> builder.lessThanOrEqualTo(root.get("deadline"), deadlineTo);
    }

    private Sort resolveSort(DefectListQuery query) {
        String requestedSortBy = normalizeNullable(query == null ? null : query.sortBy());
        String requestedSortDir = normalizeNullable(query == null ? null : query.sortDir());

        String sortBy = switch (requestedSortBy == null ? "" : requestedSortBy.toLowerCase(Locale.ROOT)) {
            case "docno", "defectno" -> "defectNo";
            case "title" -> "title";
            case "type" -> "type";
            case "severity" -> "severity";
            case "status" -> "status";
            case "reporter", "reporterid" -> "reporterId";
            case "assignee", "assigneeid" -> "assigneeId";
            case "deadline" -> "deadline";
            case "createdat" -> "createdAt";
            case "updatedat" -> "updatedAt";
            default -> "id";
        };

        Sort.Direction direction = "asc".equalsIgnoreCase(requestedSortDir) ? Sort.Direction.ASC : Sort.Direction.DESC;
        return Sort.by(direction, sortBy);
    }

    private void notifyAssigneeAssigned(Defect entity) {
        if (notificationEventService == null) {
            return;
        }

        notificationEventService.create(
                entity.getAssigneeId(),
                "담당자배정",
                "결함 배정",
                entity.getDefectNo() + " '" + entity.getTitle() + "' 결함이 배정되었습니다.",
                REF_TYPE_DEFECT,
                entity.getId()
        );
    }

    private void notifyAssigneeChanged(Defect entity, Long previousAssigneeId) {
        Long currentAssigneeId = entity.getAssigneeId();
        if (currentAssigneeId == null || currentAssigneeId.equals(previousAssigneeId)) {
            return;
        }

        notifyAssigneeAssigned(entity);
    }

    private void notifyStatusChanged(Defect entity, String previousStatus) {
        if (notificationEventService == null) {
            return;
        }

        String currentStatus = entity.getStatus();
        if (currentStatus == null || currentStatus.equals(previousStatus)) {
            return;
        }

        notificationEventService.create(
                entity.getReporterId(),
                "상태변경",
                "결함 상태 변경",
                entity.getDefectNo() + " 상태가 '" + currentStatus + "'(으)로 변경되었습니다.",
                REF_TYPE_DEFECT,
                entity.getId()
        );
    }

    private void recordCreated(Defect entity) {
        recordActivity(entity, "CREATED", null, null, null, entity.getDefectNo() + " 결함이 등록되었습니다.");
    }

    private void recordUpdated(Defect entity) {
        recordActivity(entity, "UPDATED", null, null, null, entity.getDefectNo() + " 결함 내용이 수정되었습니다.");
    }

    private void recordStatusChanged(Defect entity, String previousStatus) {
        String currentStatus = entity.getStatus();
        if (currentStatus == null || currentStatus.equals(previousStatus)) {
            return;
        }

        recordActivity(
                entity,
                "STATUS_CHANGED",
                "status",
                previousStatus,
                currentStatus,
                entity.getDefectNo() + " 상태가 '" + currentStatus + "'(으)로 변경되었습니다."
        );
    }

    private void recordAssigneeChanged(Defect entity, Long previousAssigneeId) {
        Long currentAssigneeId = entity.getAssigneeId();
        if ((previousAssigneeId == null && currentAssigneeId == null)
                || (previousAssigneeId != null && previousAssigneeId.equals(currentAssigneeId))) {
            return;
        }

        recordActivity(
                entity,
                "ASSIGNEE_CHANGED",
                "assigneeId",
                previousAssigneeId == null ? null : String.valueOf(previousAssigneeId),
                currentAssigneeId == null ? null : String.valueOf(currentAssigneeId),
                entity.getDefectNo() + " 담당자가 변경되었습니다."
        );
    }

    private void recordDeleted(Defect entity) {
        recordActivity(entity, "DELETED", null, null, null, entity.getDefectNo() + " 결함이 삭제되었습니다.");
    }

    private void recordActivity(
            Defect entity,
            String actionType,
            String fieldName,
            String beforeValue,
            String afterValue,
            String message
    ) {
        if (activityLogService == null || entity == null || entity.getId() == null || entity.getTeamId() == null) {
            return;
        }

        Long actorId = TeamRequestContext.getCurrentUserId();
        try {
            activityLogService.recordLog(new ActivityLogCreateCommand(
                    entity.getTeamId(),
                    REF_TYPE_DEFECT,
                    entity.getId(),
                    actionType,
                    actorId,
                    fieldName,
                    beforeValue,
                    afterValue,
                    message
            ));
        } catch (RuntimeException ignored) {
            // 처리 이력 저장 실패가 본 작업 트랜잭션을 깨지 않도록 방어한다.
        }
    }

    private void syncDocumentIndex(Defect entity) {
        if (documentIndexSyncService == null) {
            return;
        }
        documentIndexSyncService.upsert(
                REF_TYPE_DEFECT,
                entity.getId(),
                entity.getTeamId(),
                entity.getDefectNo(),
                entity.getTitle(),
                entity.getStatus()
        );
    }

    private void deleteDocumentIndex(Defect entity) {
        if (documentIndexSyncService == null) {
            return;
        }
        documentIndexSyncService.delete(
                REF_TYPE_DEFECT,
                entity.getId(),
                entity.getTeamId()
        );
    }
}
