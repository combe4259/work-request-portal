package org.example.domain.workRequest.service;

import jakarta.persistence.EntityNotFoundException;
import org.example.domain.documentIndex.service.DocumentIndexSyncService;
import org.example.domain.notification.service.NotificationEventService;
import org.example.domain.workRequest.dto.WorkRequestCreateRequest;
import org.example.domain.workRequest.dto.WorkRequestDetailResponse;
import org.example.domain.workRequest.dto.WorkRequestListResponse;
import org.example.domain.workRequest.dto.WorkRequestRelatedRefItemRequest;
import org.example.domain.workRequest.dto.WorkRequestRelatedRefResponse;
import org.example.domain.workRequest.dto.WorkRequestRelatedRefsUpdateRequest;
import org.example.domain.workRequest.dto.WorkRequestUpdateRequest;
import org.example.domain.workRequest.entity.WorkRequest;
import org.example.domain.workRequest.entity.WorkRequestRelatedRef;
import org.example.domain.workRequest.mapper.WorkRequestMapper;
import org.example.domain.workRequest.repository.WorkRequestQueryRepository;
import org.example.domain.workRequest.repository.WorkRequestRelatedRefRepository;
import org.example.domain.workRequest.repository.WorkRequestRepository;
import org.example.global.team.TeamScopeUtil;
import org.example.global.util.DocumentNoGenerator;
import org.springframework.http.HttpStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;

@Service
@Transactional(readOnly = true)
public class WorkRequestServiceImpl implements WorkRequestService {

    private final WorkRequestRepository workRequestRepository;
    @SuppressWarnings("unused")
    private final WorkRequestQueryRepository workRequestQueryRepository;
    private final WorkRequestRelatedRefRepository workRequestRelatedRefRepository;
    private final DocumentNoGenerator documentNoGenerator;
    private final NotificationEventService notificationEventService;
    private final DocumentIndexSyncService documentIndexSyncService;

    public WorkRequestServiceImpl(
            WorkRequestRepository workRequestRepository,
            WorkRequestQueryRepository workRequestQueryRepository,
            WorkRequestRelatedRefRepository workRequestRelatedRefRepository,
            DocumentNoGenerator documentNoGenerator,
            NotificationEventService notificationEventService,
            DocumentIndexSyncService documentIndexSyncService
    ) {
        this.workRequestRepository = workRequestRepository;
        this.workRequestQueryRepository = workRequestQueryRepository;
        this.workRequestRelatedRefRepository = workRequestRelatedRefRepository;
        this.documentNoGenerator = documentNoGenerator;
        this.notificationEventService = notificationEventService;
        this.documentIndexSyncService = documentIndexSyncService;
    }

    @Override
    public Page<WorkRequestListResponse> findPage(int page, int size) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id"));
        Long teamId = TeamScopeUtil.currentTeamId();
        return (teamId == null
                ? workRequestRepository.findAll(pageable)
                : workRequestRepository.findByTeamId(teamId, pageable))
                .map(WorkRequestMapper::toListResponse);
    }

    @Override
    public WorkRequestDetailResponse findById(Long id) {
        WorkRequest entity = workRequestRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("WorkRequest not found: " + id));
        TeamScopeUtil.ensureAccessible(entity.getTeamId());
        return WorkRequestMapper.toDetailResponse(entity);
    }

    @Override
    @Transactional
    public Long create(WorkRequestCreateRequest request) {
        WorkRequest entity = WorkRequestMapper.fromCreateRequest(request);

        entity.setRequestNo(documentNoGenerator.next("WR"));
        entity.setTeamId(TeamScopeUtil.requireTeamId(request.teamId()));
        entity.setType(defaultIfBlank(request.type(), "기능개선"));
        entity.setPriority(defaultIfBlank(request.priority(), "보통"));
        entity.setStatus(defaultIfBlank(request.status(), "접수대기"));

        WorkRequest saved = workRequestRepository.save(entity);
        syncDocumentIndex(saved);
        notifyAssigneeAssigned(saved);
        return saved.getId();
    }

    @Override
    @Transactional
    public void update(Long id, WorkRequestUpdateRequest request) {
        WorkRequest entity = workRequestRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("WorkRequest not found: " + id));
        TeamScopeUtil.ensureAccessible(entity.getTeamId());

        Long previousAssigneeId = entity.getAssigneeId();
        String previousStatus = entity.getStatus();

        WorkRequestMapper.applyUpdate(entity, request);
        syncDocumentIndex(entity);

        notifyAssigneeChanged(entity, previousAssigneeId);
        notifyStatusChanged(entity, previousStatus);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        WorkRequest entity = workRequestRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("WorkRequest not found: " + id));
        TeamScopeUtil.ensureAccessible(entity.getTeamId());

        workRequestRelatedRefRepository.deleteByWorkRequestId(id);
        workRequestRepository.delete(entity);
        deleteDocumentIndex(entity);
    }

    @Override
    public List<WorkRequestRelatedRefResponse> getRelatedRefs(Long id) {
        ensureAccessibleWorkRequest(id);
        return workRequestRelatedRefRepository.findByWorkRequestIdOrderBySortOrderAscIdAsc(id).stream()
                .map(ref -> new WorkRequestRelatedRefResponse(
                        ref.getRefType(),
                        ref.getRefId(),
                        toFallbackRefNo(ref.getRefType(), ref.getRefId()),
                        null
                ))
                .toList();
    }

    @Override
    @Transactional
    public void replaceRelatedRefs(Long id, WorkRequestRelatedRefsUpdateRequest request) {
        ensureAccessibleWorkRequest(id);
        workRequestRelatedRefRepository.deleteByWorkRequestId(id);

        if (request == null || request.items() == null || request.items().isEmpty()) {
            return;
        }

        List<WorkRequestRelatedRefItemRequest> sortedItems = request.items().stream()
                .filter(item -> item != null)
                .sorted((a, b) -> {
                    int left = a.sortOrder() == null ? Integer.MAX_VALUE : a.sortOrder();
                    int right = b.sortOrder() == null ? Integer.MAX_VALUE : b.sortOrder();
                    return Integer.compare(left, right);
                })
                .toList();

        LinkedHashSet<String> seen = new LinkedHashSet<>();
        List<WorkRequestRelatedRef> rows = new ArrayList<>();
        int defaultSortOrder = 1;

        for (WorkRequestRelatedRefItemRequest item : sortedItems) {
            if (item.refId() == null || isBlank(item.refType())) {
                continue;
            }

            String normalizedRefType = normalizeRefType(item.refType());
            String uniqueKey = normalizedRefType + ":" + item.refId();
            if (!seen.add(uniqueKey)) {
                continue;
            }

            WorkRequestRelatedRef row = new WorkRequestRelatedRef();
            row.setWorkRequestId(id);
            row.setRefType(normalizedRefType);
            row.setRefId(item.refId());
            row.setSortOrder(item.sortOrder() == null ? defaultSortOrder : item.sortOrder());
            rows.add(row);
            defaultSortOrder++;
        }

        if (!rows.isEmpty()) {
            workRequestRelatedRefRepository.saveAll(rows);
        }
    }

    private void ensureAccessibleWorkRequest(Long id) {
        WorkRequest entity = workRequestRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("WorkRequest not found: " + id));
        TeamScopeUtil.ensureAccessible(entity.getTeamId());
    }

    private String normalizeRefType(String rawRefType) {
        String value = rawRefType.trim().toUpperCase(Locale.ROOT);
        return switch (value) {
            case "WORK_REQUEST", "TECH_TASK", "TEST_SCENARIO", "DEFECT", "DEPLOYMENT", "MEETING_NOTE", "PROJECT_IDEA",
                    "KNOWLEDGE_BASE" -> value;
            default -> throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST, "유효하지 않은 refType입니다.");
        };
    }

    private String toFallbackRefNo(String refType, Long refId) {
        String prefix = switch (refType) {
            case "WORK_REQUEST" -> "WR";
            case "TECH_TASK" -> "TK";
            case "TEST_SCENARIO" -> "TS";
            case "DEFECT" -> "DF";
            case "DEPLOYMENT" -> "DP";
            case "MEETING_NOTE" -> "MN";
            case "PROJECT_IDEA" -> "ID";
            case "KNOWLEDGE_BASE" -> "KB";
            default -> "REF";
        };
        return prefix + "-" + refId;
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private String defaultIfBlank(String value, String defaultValue) {
        if (value == null || value.isBlank()) {
            return defaultValue;
        }
        return value;
    }

    private void notifyAssigneeAssigned(WorkRequest entity) {
        if (notificationEventService == null) {
            return;
        }

        notificationEventService.create(
                entity.getAssigneeId(),
                "담당자배정",
                "업무요청 배정",
                entity.getRequestNo() + " '" + entity.getTitle() + "' 업무가 배정되었습니다.",
                "WORK_REQUEST",
                entity.getId()
        );
    }

    private void notifyAssigneeChanged(WorkRequest entity, Long previousAssigneeId) {
        Long currentAssigneeId = entity.getAssigneeId();
        if (currentAssigneeId == null || currentAssigneeId.equals(previousAssigneeId)) {
            return;
        }

        notifyAssigneeAssigned(entity);
    }

    private void notifyStatusChanged(WorkRequest entity, String previousStatus) {
        if (notificationEventService == null) {
            return;
        }

        String currentStatus = entity.getStatus();
        if (currentStatus == null || currentStatus.equals(previousStatus)) {
            return;
        }

        notificationEventService.create(
                entity.getRequesterId(),
                "상태변경",
                "업무요청 상태 변경",
                entity.getRequestNo() + " 상태가 '" + currentStatus + "'(으)로 변경되었습니다.",
                "WORK_REQUEST",
                entity.getId()
        );
    }

    private void syncDocumentIndex(WorkRequest entity) {
        if (documentIndexSyncService == null) {
            return;
        }
        documentIndexSyncService.upsert(
                "WORK_REQUEST",
                entity.getId(),
                entity.getTeamId(),
                entity.getRequestNo(),
                entity.getTitle(),
                entity.getStatus()
        );
    }

    private void deleteDocumentIndex(WorkRequest entity) {
        if (documentIndexSyncService == null) {
            return;
        }
        documentIndexSyncService.delete(
                "WORK_REQUEST",
                entity.getId(),
                entity.getTeamId()
        );
    }
}
