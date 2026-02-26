package org.example.domain.techTask.service;

import jakarta.persistence.EntityNotFoundException;
import org.example.domain.activityLog.service.ActivityLogCreateCommand;
import org.example.domain.activityLog.service.ActivityLogService;
import org.example.domain.documentIndex.service.DocumentIndexSyncService;
import org.example.domain.notification.service.NotificationEventService;
import org.example.domain.techTask.dto.TechTaskCreateRequest;
import org.example.domain.techTask.dto.TechTaskDetailResponse;
import org.example.domain.techTask.dto.TechTaskListQuery;
import org.example.domain.techTask.dto.TechTaskListResponse;
import org.example.domain.techTask.dto.TechTaskPrLinkCreateRequest;
import org.example.domain.techTask.dto.TechTaskPrLinkResponse;
import org.example.domain.techTask.dto.TechTaskRelatedRefItemRequest;
import org.example.domain.techTask.dto.TechTaskRelatedRefsUpdateRequest;
import org.example.domain.techTask.dto.TechTaskRelatedRefResponse;
import org.example.domain.techTask.dto.TechTaskStatusUpdateRequest;
import org.example.domain.techTask.dto.TechTaskUpdateRequest;
import org.example.domain.techTask.entity.TechTask;
import org.example.domain.techTask.entity.TechTaskPrLink;
import org.example.domain.techTask.entity.TechTaskRelatedRef;
import org.example.domain.techTask.mapper.TechTaskMapper;
import org.example.domain.techTask.repository.TechTaskPrLinkRepository;
import org.example.domain.techTask.repository.TechTaskRelatedRefRepository;
import org.example.domain.techTask.repository.TechTaskRepository;
import org.example.domain.workRequest.entity.WorkRequest;
import org.example.domain.workRequest.repository.WorkRequestRepository;
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
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;

@Service
@Transactional(readOnly = true)
public class TechTaskServiceImpl implements TechTaskService {

    private static final String REF_TYPE_WORK_REQUEST = "WORK_REQUEST";
    private static final String REF_TYPE_TECH_TASK = "TECH_TASK";
    private static final String TECH_TASK_NOT_FOUND_PREFIX = "TechTask not found: ";

    private final TechTaskRepository techTaskRepository;
    private final TechTaskRelatedRefRepository techTaskRelatedRefRepository;
    private final TechTaskPrLinkRepository techTaskPrLinkRepository;
    private final WorkRequestRepository workRequestRepository;
    private final DocumentNoGenerator documentNoGenerator;
    private final NotificationEventService notificationEventService;
    private final DocumentIndexSyncService documentIndexSyncService;
    private final ActivityLogService activityLogService;

    public TechTaskServiceImpl(
            TechTaskRepository techTaskRepository,
            TechTaskRelatedRefRepository techTaskRelatedRefRepository,
            TechTaskPrLinkRepository techTaskPrLinkRepository,
            WorkRequestRepository workRequestRepository,
            DocumentNoGenerator documentNoGenerator,
            NotificationEventService notificationEventService,
            DocumentIndexSyncService documentIndexSyncService,
            @Nullable ActivityLogService activityLogService
    ) {
        this.techTaskRepository = techTaskRepository;
        this.techTaskRelatedRefRepository = techTaskRelatedRefRepository;
        this.techTaskPrLinkRepository = techTaskPrLinkRepository;
        this.workRequestRepository = workRequestRepository;
        this.documentNoGenerator = documentNoGenerator;
        this.notificationEventService = notificationEventService;
        this.documentIndexSyncService = documentIndexSyncService;
        this.activityLogService = activityLogService;
    }

    @Override
    public Page<TechTaskListResponse> findPage(int page, int size, TechTaskListQuery query) {
        PageRequest pageable = PageRequest.of(page, size, resolveSort(query));
        Long teamId = TeamScopeUtil.currentTeamId();

        Specification<TechTask> spec = Specification.where(byTeamId(teamId))
                .and(byKeyword(query == null ? null : query.q()))
                .and(byExact("type", query == null ? null : query.type()))
                .and(byExact("priority", query == null ? null : query.priority()))
                .and(byExact("status", query == null ? null : query.status()))
                .and(byAssigneeId(query == null ? null : query.assigneeId()))
                .and(byDeadlineFrom(query == null ? null : query.deadlineFrom()))
                .and(byDeadlineTo(query == null ? null : query.deadlineTo()));

        return techTaskRepository.findAll(spec, pageable).map(TechTaskMapper::toListResponse);
    }

    @Override
    public TechTaskDetailResponse findById(Long id) {
        TechTask entity = techTaskRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException(TECH_TASK_NOT_FOUND_PREFIX + id));
        TeamScopeUtil.ensureAccessible(entity.getTeamId());
        return TechTaskMapper.toDetailResponse(entity);
    }

    @Override
    @Transactional
    public Long create(TechTaskCreateRequest request) {
        TechTask entity = TechTaskMapper.fromCreateRequest(request);

        entity.setTaskNo(documentNoGenerator.next("TK"));
        entity.setTeamId(TeamScopeUtil.requireTeamId(request.teamId()));
        entity.setType(defaultIfBlank(request.type(), "기타"));
        entity.setPriority(defaultIfBlank(request.priority(), "보통"));
        entity.setStatus(defaultIfBlank(request.status(), "접수대기"));

        TechTask saved = techTaskRepository.save(entity);
        syncDocumentIndex(saved);
        recordCreated(saved);
        notifyAssigneeAssigned(saved);
        return saved.getId();
    }

    @Override
    @Transactional
    public void update(Long id, TechTaskUpdateRequest request) {
        TechTask entity = techTaskRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException(TECH_TASK_NOT_FOUND_PREFIX + id));
        TeamScopeUtil.ensureAccessible(entity.getTeamId());

        Long previousAssigneeId = entity.getAssigneeId();
        String previousStatus = entity.getStatus();

        TechTaskMapper.applyUpdate(entity, request);
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
        TechTask entity = techTaskRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException(TECH_TASK_NOT_FOUND_PREFIX + id));
        TeamScopeUtil.ensureAccessible(entity.getTeamId());
        recordDeleted(entity);

        techTaskRepository.delete(entity);
        deleteDocumentIndex(entity);
    }

    @Override
    @Transactional
    public void updateStatus(Long id, TechTaskStatusUpdateRequest request) {
        if (request == null || isBlank(request.status())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "status는 필수입니다.");
        }

        TechTask entity = techTaskRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException(TECH_TASK_NOT_FOUND_PREFIX + id));
        TeamScopeUtil.ensureAccessible(entity.getTeamId());
        String previousStatus = entity.getStatus();
        entity.setStatus(request.status().trim());
        syncDocumentIndex(entity);
        recordStatusChanged(entity, previousStatus);

        notifyStatusChanged(entity, previousStatus);
    }

    @Override
    public List<TechTaskRelatedRefResponse> getRelatedRefs(Long id) {
        ensureTechTaskExists(id);

        return techTaskRelatedRefRepository.findByTechTaskIdOrderByIdAsc(id).stream()
                .map(ref -> {
                    RefMetadata metadata = resolveRefMetadata(ref.getRefType(), ref.getRefId());
                    return new TechTaskRelatedRefResponse(
                            ref.getRefType(),
                            ref.getRefId(),
                            metadata.refNo(),
                            metadata.title()
                    );
                })
                .toList();
    }

    @Override
    @Transactional
    public void replaceRelatedRefs(Long id, TechTaskRelatedRefsUpdateRequest request) {
        ensureTechTaskExists(id);

        techTaskRelatedRefRepository.deleteByTechTaskId(id);

        if (request == null || request.items() == null || request.items().isEmpty()) {
            return;
        }

        List<TechTaskRelatedRefItemRequest> sortedItems = request.items().stream()
                .sorted((a, b) -> {
                    int left = a.sortOrder() == null ? Integer.MAX_VALUE : a.sortOrder();
                    int right = b.sortOrder() == null ? Integer.MAX_VALUE : b.sortOrder();
                    return Integer.compare(left, right);
                })
                .toList();

        LinkedHashSet<String> seen = new LinkedHashSet<>();
        List<TechTaskRelatedRef> rows = new ArrayList<>();

        for (TechTaskRelatedRefItemRequest item : sortedItems) {
            if (item == null || item.refId() == null || isBlank(item.refType())) {
                continue;
            }

            String normalizedRefType = normalizeRefType(item.refType());
            String uniqueKey = normalizedRefType + ":" + item.refId();
            if (!seen.add(uniqueKey)) {
                continue;
            }

            TechTaskRelatedRef row = new TechTaskRelatedRef();
            row.setTechTaskId(id);
            row.setRefType(normalizedRefType);
            row.setRefId(item.refId());
            rows.add(row);
        }

        if (!rows.isEmpty()) {
            techTaskRelatedRefRepository.saveAll(rows);
        }
    }

    @Override
    public List<TechTaskPrLinkResponse> getPrLinks(Long id) {
        ensureTechTaskExists(id);

        return techTaskPrLinkRepository.findByTechTaskIdOrderByIdAsc(id).stream()
                .map(link -> new TechTaskPrLinkResponse(
                        link.getId(),
                        link.getBranchName(),
                        link.getPrNo(),
                        link.getPrUrl()
                ))
                .toList();
    }

    @Override
    @Transactional
    public Long createPrLink(Long id, TechTaskPrLinkCreateRequest request) {
        ensureTechTaskExists(id);

        if (request == null || isBlank(request.branchName())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "branchName은 필수입니다.");
        }

        TechTaskPrLink row = new TechTaskPrLink();
        row.setTechTaskId(id);
        row.setBranchName(request.branchName().trim());
        row.setPrNo(normalizeNullable(request.prNo()));
        row.setPrUrl(normalizeNullable(request.prUrl()));

        return techTaskPrLinkRepository.save(row).getId();
    }

    @Override
    @Transactional
    public void deletePrLink(Long id, Long linkId) {
        ensureTechTaskExists(id);

        TechTaskPrLink row = techTaskPrLinkRepository.findByIdAndTechTaskId(linkId, id)
                .orElseThrow(() -> new EntityNotFoundException("TechTaskPrLink not found: " + linkId));
        techTaskPrLinkRepository.delete(row);
    }

    private void ensureTechTaskExists(Long id) {
        if (id == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "id는 필수입니다.");
        }
        Long scopedTeamId = TeamScopeUtil.currentTeamId();
        if (scopedTeamId == null) {
            if (!techTaskRepository.existsById(id)) {
                throw new EntityNotFoundException(TECH_TASK_NOT_FOUND_PREFIX + id);
            }
            return;
        }

        TechTask entity = techTaskRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException(TECH_TASK_NOT_FOUND_PREFIX + id));
        TeamScopeUtil.ensureAccessible(entity.getTeamId());
    }

    private Specification<TechTask> byTeamId(Long teamId) {
        if (teamId == null) {
            return null;
        }
        return (root, query, builder) -> builder.equal(root.get("teamId"), teamId);
    }

    private Specification<TechTask> byKeyword(String rawKeyword) {
        String keyword = normalizeNullable(rawKeyword);
        if (keyword == null) {
            return null;
        }

        return (root, query, builder) -> {
            String likeKeyword = "%" + keyword.toLowerCase(Locale.ROOT) + "%";
            return builder.or(
                    builder.like(builder.lower(root.get("title")), likeKeyword),
                    builder.like(builder.lower(root.get("taskNo")), likeKeyword)
            );
        };
    }

    private Specification<TechTask> byExact(String column, String rawValue) {
        String value = normalizeNullable(rawValue);
        if (value == null) {
            return null;
        }
        return (root, query, builder) -> builder.equal(root.get(column), value);
    }

    private Specification<TechTask> byAssigneeId(Long assigneeId) {
        if (assigneeId == null) {
            return null;
        }
        return (root, query, builder) -> builder.equal(root.get("assigneeId"), assigneeId);
    }

    private Specification<TechTask> byDeadlineFrom(LocalDate deadlineFrom) {
        if (deadlineFrom == null) {
            return null;
        }
        return (root, query, builder) -> builder.greaterThanOrEqualTo(root.get("deadline"), deadlineFrom);
    }

    private Specification<TechTask> byDeadlineTo(LocalDate deadlineTo) {
        if (deadlineTo == null) {
            return null;
        }
        return (root, query, builder) -> builder.lessThanOrEqualTo(root.get("deadline"), deadlineTo);
    }

    private Sort resolveSort(TechTaskListQuery query) {
        String requestedSortBy = normalizeNullable(query == null ? null : query.sortBy());
        String requestedSortDir = normalizeNullable(query == null ? null : query.sortDir());

        String sortBy = switch (requestedSortBy == null ? "" : requestedSortBy.toLowerCase(Locale.ROOT)) {
            case "docno", "taskno" -> "taskNo";
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
            case REF_TYPE_WORK_REQUEST, REF_TYPE_TECH_TASK, "TEST_SCENARIO", "DEFECT", "DEPLOYMENT" -> value;
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "유효하지 않은 refType입니다.");
        };
    }

    private RefMetadata resolveRefMetadata(String refType, Long refId) {
        String normalizedRefType = normalizeRefType(refType);

        if (REF_TYPE_WORK_REQUEST.equals(normalizedRefType)) {
            WorkRequest wr = workRequestRepository.findById(refId).orElse(null);
            if (wr != null) {
                return new RefMetadata(wr.getRequestNo(), wr.getTitle());
            }
        }

        if (REF_TYPE_TECH_TASK.equals(normalizedRefType)) {
            TechTask task = techTaskRepository.findById(refId).orElse(null);
            if (task != null && (TeamScopeUtil.currentTeamId() == null || TeamScopeUtil.currentTeamId().equals(task.getTeamId()))) {
                return new RefMetadata(task.getTaskNo(), task.getTitle());
            }
        }

        return new RefMetadata(toFallbackRefNo(normalizedRefType, refId), null);
    }

    private String toFallbackRefNo(String refType, Long refId) {
        String prefix = switch (refType) {
            case REF_TYPE_WORK_REQUEST -> "WR";
            case REF_TYPE_TECH_TASK -> "TK";
            case "TEST_SCENARIO" -> "TS";
            case "DEFECT" -> "DF";
            case "DEPLOYMENT" -> "DP";
            default -> "REF";
        };

        return prefix + "-" + refId;
    }

    private String defaultIfBlank(String value, String defaultValue) {
        if (isBlank(value)) {
            return defaultValue;
        }
        return value.trim();
    }

    private String normalizeNullable(String value) {
        return isBlank(value) ? null : value.trim();
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private void notifyAssigneeAssigned(TechTask entity) {
        if (notificationEventService == null) {
            return;
        }

        notificationEventService.create(
                entity.getAssigneeId(),
                "담당자배정",
                "기술과제 배정",
                entity.getTaskNo() + " '" + entity.getTitle() + "' 과제가 배정되었습니다.",
                REF_TYPE_TECH_TASK,
                entity.getId()
        );
    }

    private void notifyAssigneeChanged(TechTask entity, Long previousAssigneeId) {
        Long currentAssigneeId = entity.getAssigneeId();
        if (currentAssigneeId == null || currentAssigneeId.equals(previousAssigneeId)) {
            return;
        }

        notifyAssigneeAssigned(entity);
    }

    private void notifyStatusChanged(TechTask entity, String previousStatus) {
        if (notificationEventService == null) {
            return;
        }

        String currentStatus = entity.getStatus();
        if (currentStatus == null || currentStatus.equals(previousStatus)) {
            return;
        }

        notificationEventService.create(
                entity.getRegistrantId(),
                "상태변경",
                "기술과제 상태 변경",
                entity.getTaskNo() + " 상태가 '" + currentStatus + "'(으)로 변경되었습니다.",
                REF_TYPE_TECH_TASK,
                entity.getId()
        );
    }

    private void recordCreated(TechTask entity) {
        recordActivity(entity, "CREATED", null, null, null, entity.getTaskNo() + " 기술과제가 등록되었습니다.");
    }

    private void recordUpdated(TechTask entity) {
        recordActivity(entity, "UPDATED", null, null, null, entity.getTaskNo() + " 기술과제 내용이 수정되었습니다.");
    }

    private void recordStatusChanged(TechTask entity, String previousStatus) {
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
                entity.getTaskNo() + " 상태가 '" + currentStatus + "'(으)로 변경되었습니다."
        );
    }

    private void recordAssigneeChanged(TechTask entity, Long previousAssigneeId) {
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
                entity.getTaskNo() + " 담당자가 변경되었습니다."
        );
    }

    private void recordDeleted(TechTask entity) {
        recordActivity(entity, "DELETED", null, null, null, entity.getTaskNo() + " 기술과제가 삭제되었습니다.");
    }

    private void recordActivity(
            TechTask entity,
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
                    REF_TYPE_TECH_TASK,
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

    private record RefMetadata(String refNo, String title) {
    }

    private void syncDocumentIndex(TechTask entity) {
        if (documentIndexSyncService == null) {
            return;
        }
        documentIndexSyncService.upsert(
                REF_TYPE_TECH_TASK,
                entity.getId(),
                entity.getTeamId(),
                entity.getTaskNo(),
                entity.getTitle(),
                entity.getStatus()
        );
    }

    private void deleteDocumentIndex(TechTask entity) {
        if (documentIndexSyncService == null) {
            return;
        }
        documentIndexSyncService.delete(
                REF_TYPE_TECH_TASK,
                entity.getId(),
                entity.getTeamId()
        );
    }
}
