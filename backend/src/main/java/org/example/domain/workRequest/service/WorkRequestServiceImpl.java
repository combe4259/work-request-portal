package org.example.domain.workRequest.service;

import jakarta.persistence.EntityNotFoundException;
import org.example.domain.activityLog.service.ActivityLogCreateCommand;
import org.example.domain.activityLog.service.ActivityLogService;
import org.example.domain.documentIndex.service.DocumentIndexSyncService;
import org.example.domain.notification.service.NotificationEventService;
import org.example.domain.workRequest.dto.WorkRequestCreateRequest;
import org.example.domain.workRequest.dto.WorkRequestDetailResponse;
import org.example.domain.workRequest.dto.WorkRequestListQuery;
import org.example.domain.workRequest.dto.WorkRequestListResponse;
import org.example.domain.workRequest.dto.WorkRequestRelatedRefItemRequest;
import org.example.domain.workRequest.dto.WorkRequestRelatedRefResponse;
import org.example.domain.workRequest.dto.WorkRequestRelatedRefsUpdateRequest;
import org.example.domain.workRequest.dto.WorkRequestStatusUpdateRequest;
import org.example.domain.workRequest.dto.WorkRequestUpdateRequest;
import org.example.domain.workRequest.entity.WorkRequest;
import org.example.domain.workRequest.entity.WorkRequestRelatedRef;
import org.example.domain.workRequest.mapper.WorkRequestMapper;
import org.example.domain.workRequest.repository.WorkRequestQueryRepository;
import org.example.domain.workRequest.repository.WorkRequestRelatedRefRepository;
import org.example.domain.workRequest.repository.WorkRequestRepository;
import org.example.global.team.TeamRequestContext;
import org.example.global.team.TeamScopeUtil;
import org.example.global.util.DocumentNoGenerator;
import org.springframework.http.HttpStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;

@Service
@Transactional(readOnly = true)
public class WorkRequestServiceImpl implements WorkRequestService {

    private static final String REF_TYPE_WORK_REQUEST = "WORK_REQUEST";
    private static final String WORK_REQUEST_NOT_FOUND_PREFIX = "WorkRequest not found: ";

    private final WorkRequestRepository workRequestRepository;
    @SuppressWarnings("unused")
    private final WorkRequestQueryRepository workRequestQueryRepository;
    private final WorkRequestRelatedRefRepository workRequestRelatedRefRepository;
    private final DocumentNoGenerator documentNoGenerator;
    private final NotificationEventService notificationEventService;
    private final DocumentIndexSyncService documentIndexSyncService;
    private final ActivityLogService activityLogService;

    public WorkRequestServiceImpl(
            WorkRequestRepository workRequestRepository,
            WorkRequestQueryRepository workRequestQueryRepository,
            WorkRequestRelatedRefRepository workRequestRelatedRefRepository,
            DocumentNoGenerator documentNoGenerator,
            NotificationEventService notificationEventService,
            DocumentIndexSyncService documentIndexSyncService,
            @Nullable ActivityLogService activityLogService
    ) {
        this.workRequestRepository = workRequestRepository;
        this.workRequestQueryRepository = workRequestQueryRepository;
        this.workRequestRelatedRefRepository = workRequestRelatedRefRepository;
        this.documentNoGenerator = documentNoGenerator;
        this.notificationEventService = notificationEventService;
        this.documentIndexSyncService = documentIndexSyncService;
        this.activityLogService = activityLogService;
    }

    @Override
    public Page<WorkRequestListResponse> findPage(int page, int size, WorkRequestListQuery query) {
        PageRequest pageable = PageRequest.of(page, size, resolveSort(query));
        Long teamId = requireCurrentTeamId();

        Specification<WorkRequest> spec = byTeamId(teamId)
                .and(byKeyword(query == null ? null : query.q()))
                .and(byExact("type", query == null ? null : query.type()))
                .and(byExact("priority", query == null ? null : query.priority()))
                .and(byExact("status", query == null ? null : query.status()))
                .and(byAssigneeId(query == null ? null : query.assigneeId()))
                .and(byDeadlineFrom(query == null ? null : query.deadlineFrom()))
                .and(byDeadlineTo(query == null ? null : query.deadlineTo()));

        return workRequestRepository.findAll(spec, pageable).map(WorkRequestMapper::toListResponse);
    }

    @Override
    public WorkRequestDetailResponse findById(Long id) {
        WorkRequest entity = workRequestRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException(WORK_REQUEST_NOT_FOUND_PREFIX + id));
        ensureSameTeam(entity.getTeamId());
        return WorkRequestMapper.toDetailResponse(entity);
    }

    @Override
    @Transactional
    public Long create(WorkRequestCreateRequest request) {
        WorkRequest entity = WorkRequestMapper.fromCreateRequest(request);

        entity.setRequestNo(documentNoGenerator.next("WR"));
        entity.setTeamId(requireCurrentTeamId());
        entity.setType(defaultIfBlank(request.type(), "기능개선"));
        entity.setPriority(defaultIfBlank(request.priority(), "보통"));
        entity.setStatus(defaultIfBlank(request.status(), "접수대기"));

        WorkRequest saved = workRequestRepository.save(entity);
        syncDocumentIndex(saved);
        recordCreated(saved);
        notifyAssigneeAssigned(saved);
        return saved.getId();
    }

    @Override
    @Transactional
    public void update(Long id, WorkRequestUpdateRequest request) {
        WorkRequest entity = workRequestRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException(WORK_REQUEST_NOT_FOUND_PREFIX + id));
        ensureSameTeam(entity.getTeamId());

        Long previousAssigneeId = entity.getAssigneeId();
        String previousStatus = entity.getStatus();

        WorkRequestMapper.applyUpdate(entity, request);
        syncDocumentIndex(entity);
        recordUpdated(entity);
        recordAssigneeChanged(entity, previousAssigneeId);
        recordStatusChanged(entity, previousStatus);

        notifyAssigneeChanged(entity, previousAssigneeId);
        notifyStatusChanged(entity, previousStatus);
    }

    @Override
    @Transactional
    public void updateStatus(Long id, WorkRequestStatusUpdateRequest request) {
        if (request == null || isBlank(request.status())) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST, "status는 필수입니다.");
        }

        WorkRequest entity = workRequestRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException(WORK_REQUEST_NOT_FOUND_PREFIX + id));
        ensureSameTeam(entity.getTeamId());

        String previousStatus = entity.getStatus();
        String nextStatus = request.status().trim();

        entity.setStatus(nextStatus);
        if ("개발중".equals(nextStatus) && entity.getStartedAt() == null) {
            entity.setStartedAt(java.time.LocalDateTime.now());
        }
        if ("완료".equals(nextStatus) && entity.getCompletedAt() == null) {
            entity.setCompletedAt(java.time.LocalDateTime.now());
        }
        if ("반려".equals(nextStatus)) {
            if (!isBlank(request.statusNote())) {
                entity.setRejectedReason(request.statusNote().trim());
            }
            if (entity.getRejectedAt() == null) {
                entity.setRejectedAt(java.time.LocalDateTime.now());
            }
        }

        syncDocumentIndex(entity);
        recordStatusChanged(entity, previousStatus);
        notifyStatusChanged(entity, previousStatus);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        WorkRequest entity = workRequestRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException(WORK_REQUEST_NOT_FOUND_PREFIX + id));
        ensureSameTeam(entity.getTeamId());
        recordDeleted(entity);

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
                .orElseThrow(() -> new EntityNotFoundException(WORK_REQUEST_NOT_FOUND_PREFIX + id));
        ensureSameTeam(entity.getTeamId());
    }

    private Long requireCurrentTeamId() {
        Long teamId = TeamScopeUtil.currentTeamId();
        if (teamId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "X-Team-Id 헤더가 필요합니다.");
        }
        return teamId;
    }

    private void ensureSameTeam(Long entityTeamId) {
        Long currentTeamId = requireCurrentTeamId();
        if (entityTeamId == null || !currentTeamId.equals(entityTeamId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "현재 팀에서 접근할 수 없는 데이터입니다.");
        }
    }

    private Specification<WorkRequest> byTeamId(Long teamId) {
        return (root, query, builder) -> builder.equal(root.get("teamId"), teamId);
    }

    private Specification<WorkRequest> byKeyword(String rawKeyword) {
        String keyword = normalizeNullable(rawKeyword);
        if (keyword == null) {
            return null;
        }

        return (root, query, builder) -> {
            String likeKeyword = "%" + keyword.toLowerCase(Locale.ROOT) + "%";
            return builder.or(
                    builder.like(builder.lower(root.get("title")), likeKeyword),
                    builder.like(builder.lower(root.get("requestNo")), likeKeyword)
            );
        };
    }

    private Specification<WorkRequest> byExact(String column, String rawValue) {
        String value = normalizeNullable(rawValue);
        if (value == null) {
            return null;
        }
        return (root, query, builder) -> builder.equal(root.get(column), value);
    }

    private Specification<WorkRequest> byAssigneeId(Long assigneeId) {
        if (assigneeId == null) {
            return null;
        }
        return (root, query, builder) -> builder.equal(root.get("assigneeId"), assigneeId);
    }

    private Specification<WorkRequest> byDeadlineFrom(LocalDate deadlineFrom) {
        if (deadlineFrom == null) {
            return null;
        }
        return (root, query, builder) -> builder.greaterThanOrEqualTo(root.get("deadline"), deadlineFrom);
    }

    private Specification<WorkRequest> byDeadlineTo(LocalDate deadlineTo) {
        if (deadlineTo == null) {
            return null;
        }
        return (root, query, builder) -> builder.lessThanOrEqualTo(root.get("deadline"), deadlineTo);
    }

    private Sort resolveSort(WorkRequestListQuery query) {
        String requestedSortBy = normalizeNullable(query == null ? null : query.sortBy());
        String requestedSortDir = normalizeNullable(query == null ? null : query.sortDir());

        String sortBy = switch (requestedSortBy == null ? "" : requestedSortBy.toLowerCase(Locale.ROOT)) {
            case "docno", "requestno" -> "requestNo";
            case "title" -> "title";
            case "type" -> "type";
            case "priority" -> "priority";
            case "status" -> "status";
            case "assignee", "assigneeid" -> "assigneeId";
            case "deadline" -> "deadline";
            case "createdat" -> "createdAt";
            case "updatedat" -> "updatedAt";
            default -> "id";
        };

        Sort.Direction direction = "asc".equalsIgnoreCase(requestedSortDir) ? Sort.Direction.ASC : Sort.Direction.DESC;
        return Sort.by(direction, sortBy);
    }

    private String normalizeRefType(String rawRefType) {
        String value = rawRefType.trim().toUpperCase(Locale.ROOT);
        return switch (value) {
            case REF_TYPE_WORK_REQUEST, "TECH_TASK", "TEST_SCENARIO", "DEFECT", "DEPLOYMENT", "MEETING_NOTE", "PROJECT_IDEA",
                    "KNOWLEDGE_BASE" -> value;
            default -> throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST, "유효하지 않은 refType입니다.");
        };
    }

    private String toFallbackRefNo(String refType, Long refId) {
        String prefix = switch (refType) {
            case REF_TYPE_WORK_REQUEST -> "WR";
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

    private String normalizeNullable(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
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
                REF_TYPE_WORK_REQUEST,
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
                REF_TYPE_WORK_REQUEST,
                entity.getId()
        );
    }

    private void recordCreated(WorkRequest entity) {
        recordActivity(entity, "CREATED", null, null, null, entity.getRequestNo() + " 업무요청이 등록되었습니다.");
    }

    private void recordUpdated(WorkRequest entity) {
        recordActivity(entity, "UPDATED", null, null, null, entity.getRequestNo() + " 업무요청 내용이 수정되었습니다.");
    }

    private void recordStatusChanged(WorkRequest entity, String previousStatus) {
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
                entity.getRequestNo() + " 상태가 '" + currentStatus + "'(으)로 변경되었습니다."
        );
    }

    private void recordAssigneeChanged(WorkRequest entity, Long previousAssigneeId) {
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
                entity.getRequestNo() + " 담당자가 변경되었습니다."
        );
    }

    private void recordDeleted(WorkRequest entity) {
        recordActivity(entity, "DELETED", null, null, null, entity.getRequestNo() + " 업무요청이 삭제되었습니다.");
    }

    private void recordActivity(
            WorkRequest entity,
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
                    REF_TYPE_WORK_REQUEST,
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

    private void syncDocumentIndex(WorkRequest entity) {
        if (documentIndexSyncService == null) {
            return;
        }
        documentIndexSyncService.upsert(
                REF_TYPE_WORK_REQUEST,
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
                REF_TYPE_WORK_REQUEST,
                entity.getId(),
                entity.getTeamId()
        );
    }
}
