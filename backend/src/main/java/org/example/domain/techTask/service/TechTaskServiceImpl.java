package org.example.domain.techTask.service;

import jakarta.persistence.EntityNotFoundException;
import org.example.domain.activityLog.service.ActivityLogCreateCommand;
import org.example.domain.activityLog.service.ActivityLogService;
import org.example.domain.documentIndex.service.DocumentIndexSyncService;
import org.example.domain.notification.service.NotificationEventService;
import org.example.domain.techTask.dto.TechTaskCreateRequest;
import org.example.domain.techTask.dto.TechTaskDetailResponse;
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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;

@Service
@Transactional(readOnly = true)
public class TechTaskServiceImpl implements TechTaskService {

    private final TechTaskRepository techTaskRepository;
    private final TechTaskRelatedRefRepository techTaskRelatedRefRepository;
    private final TechTaskPrLinkRepository techTaskPrLinkRepository;
    private final WorkRequestRepository workRequestRepository;
    private final DocumentNoGenerator documentNoGenerator;
    private final NotificationEventService notificationEventService;
    private final DocumentIndexSyncService documentIndexSyncService;
    @Autowired(required = false)
    private ActivityLogService activityLogService;

    public TechTaskServiceImpl(
            TechTaskRepository techTaskRepository,
            TechTaskRelatedRefRepository techTaskRelatedRefRepository,
            TechTaskPrLinkRepository techTaskPrLinkRepository,
            WorkRequestRepository workRequestRepository,
            DocumentNoGenerator documentNoGenerator,
            NotificationEventService notificationEventService,
            DocumentIndexSyncService documentIndexSyncService
    ) {
        this.techTaskRepository = techTaskRepository;
        this.techTaskRelatedRefRepository = techTaskRelatedRefRepository;
        this.techTaskPrLinkRepository = techTaskPrLinkRepository;
        this.workRequestRepository = workRequestRepository;
        this.documentNoGenerator = documentNoGenerator;
        this.notificationEventService = notificationEventService;
        this.documentIndexSyncService = documentIndexSyncService;
    }

    @Override
    public Page<TechTaskListResponse> findPage(int page, int size) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id"));
        Long teamId = TeamScopeUtil.currentTeamId();
        return (teamId == null
                ? techTaskRepository.findAll(pageable)
                : techTaskRepository.findByTeamId(teamId, pageable))
                .map(TechTaskMapper::toListResponse);
    }

    @Override
    public TechTaskDetailResponse findById(Long id) {
        TechTask entity = techTaskRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("TechTask not found: " + id));
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
                .orElseThrow(() -> new EntityNotFoundException("TechTask not found: " + id));
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
                .orElseThrow(() -> new EntityNotFoundException("TechTask not found: " + id));
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
                .orElseThrow(() -> new EntityNotFoundException("TechTask not found: " + id));
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
                throw new EntityNotFoundException("TechTask not found: " + id);
            }
            return;
        }

        TechTask entity = techTaskRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("TechTask not found: " + id));
        TeamScopeUtil.ensureAccessible(entity.getTeamId());
    }

    private String normalizeRefType(String rawRefType) {
        String value = rawRefType.trim().toUpperCase(Locale.ROOT);
        return switch (value) {
            case "WORK_REQUEST", "TECH_TASK", "TEST_SCENARIO", "DEFECT", "DEPLOYMENT" -> value;
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "유효하지 않은 refType입니다.");
        };
    }

    private RefMetadata resolveRefMetadata(String refType, Long refId) {
        String normalizedRefType = normalizeRefType(refType);

        if ("WORK_REQUEST".equals(normalizedRefType)) {
            WorkRequest wr = workRequestRepository.findById(refId).orElse(null);
            if (wr != null) {
                return new RefMetadata(wr.getRequestNo(), wr.getTitle());
            }
        }

        if ("TECH_TASK".equals(normalizedRefType)) {
            TechTask task = techTaskRepository.findById(refId).orElse(null);
            if (task != null && (TeamScopeUtil.currentTeamId() == null || TeamScopeUtil.currentTeamId().equals(task.getTeamId()))) {
                return new RefMetadata(task.getTaskNo(), task.getTitle());
            }
        }

        return new RefMetadata(toFallbackRefNo(normalizedRefType, refId), null);
    }

    private String toFallbackRefNo(String refType, Long refId) {
        String prefix = switch (refType) {
            case "WORK_REQUEST" -> "WR";
            case "TECH_TASK" -> "TK";
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
                "TECH_TASK",
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
                "TECH_TASK",
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
            activityLogService.record(new ActivityLogCreateCommand(
                    entity.getTeamId(),
                    "TECH_TASK",
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
                "TECH_TASK",
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
                "TECH_TASK",
                entity.getId(),
                entity.getTeamId()
        );
    }
}
