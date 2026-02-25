package org.example.domain.defect.service;

import org.example.domain.documentIndex.service.DocumentIndexSyncService;
import org.example.domain.notification.service.NotificationEventService;
import org.example.domain.defect.dto.DefectCreateRequest;
import org.example.domain.defect.dto.DefectDetailResponse;
import org.example.domain.defect.dto.DefectListResponse;
import org.example.domain.defect.dto.DefectStatusUpdateRequest;
import org.example.domain.defect.dto.DefectUpdateRequest;
import org.example.domain.defect.entity.Defect;
import org.example.domain.defect.mapper.DefectMapper;
import org.example.domain.defect.repository.DefectRepository;
import org.example.global.team.TeamScopeUtil;
import org.example.global.util.DocumentNoGenerator;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;

@Service
@Transactional(readOnly = true)
public class DefectServiceImpl implements DefectService {

    private final DefectRepository defectRepository;
    private final DocumentNoGenerator documentNoGenerator;
    private final NotificationEventService notificationEventService;
    private final DocumentIndexSyncService documentIndexSyncService;

    public DefectServiceImpl(
            DefectRepository defectRepository,
            DocumentNoGenerator documentNoGenerator,
            NotificationEventService notificationEventService,
            DocumentIndexSyncService documentIndexSyncService
    ) {
        this.defectRepository = defectRepository;
        this.documentNoGenerator = documentNoGenerator;
        this.notificationEventService = notificationEventService;
        this.documentIndexSyncService = documentIndexSyncService;
    }

    @Override
    public Page<DefectListResponse> findPage(int page, int size) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id"));
        Long teamId = TeamScopeUtil.currentTeamId();
        return (teamId == null
                ? defectRepository.findAll(pageable)
                : defectRepository.findByTeamId(teamId, pageable))
                .map(DefectMapper::toListResponse);
    }

    @Override
    public DefectDetailResponse findById(Long id) {
        Defect entity = defectRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "결함을 찾을 수 없습니다."));
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
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "결함을 찾을 수 없습니다."));
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

        notifyAssigneeChanged(entity, previousAssigneeId);
        notifyStatusChanged(entity, previousStatus);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        Defect entity = defectRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "결함을 찾을 수 없습니다."));
        TeamScopeUtil.ensureAccessible(entity.getTeamId());

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
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "결함을 찾을 수 없습니다."));
        TeamScopeUtil.ensureAccessible(entity.getTeamId());
        String previousStatus = entity.getStatus();

        entity.setStatus(request.status().trim());
        if (request.statusNote() != null) {
            entity.setStatusNote(normalizeNullable(request.statusNote()));
        }
        syncDocumentIndex(entity);

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

    private void notifyAssigneeAssigned(Defect entity) {
        if (notificationEventService == null) {
            return;
        }

        notificationEventService.create(
                entity.getAssigneeId(),
                "담당자배정",
                "결함 배정",
                entity.getDefectNo() + " '" + entity.getTitle() + "' 결함이 배정되었습니다.",
                "DEFECT",
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
                "DEFECT",
                entity.getId()
        );
    }

    private void syncDocumentIndex(Defect entity) {
        if (documentIndexSyncService == null) {
            return;
        }
        documentIndexSyncService.upsert(
                "DEFECT",
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
                "DEFECT",
                entity.getId(),
                entity.getTeamId()
        );
    }
}
