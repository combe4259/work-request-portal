package org.example.domain.deployment.service;

import org.example.domain.activityLog.service.ActivityLogCreateCommand;
import org.example.domain.activityLog.service.ActivityLogService;
import org.example.domain.documentIndex.service.DocumentIndexSyncService;
import org.example.domain.defect.entity.Defect;
import org.example.domain.defect.repository.DefectRepository;
import org.example.domain.notification.service.NotificationEventService;
import org.example.domain.deployment.dto.DeploymentCreateRequest;
import org.example.domain.deployment.dto.DeploymentDetailResponse;
import org.example.domain.deployment.dto.DeploymentListQuery;
import org.example.domain.deployment.dto.DeploymentListResponse;
import org.example.domain.deployment.dto.DeploymentRelatedRefItemRequest;
import org.example.domain.deployment.dto.DeploymentRelatedRefResponse;
import org.example.domain.deployment.dto.DeploymentRelatedRefsUpdateRequest;
import org.example.domain.deployment.dto.DeploymentStatusUpdateRequest;
import org.example.domain.deployment.dto.DeploymentStepResponse;
import org.example.domain.deployment.dto.DeploymentStepsReplaceRequest;
import org.example.domain.deployment.dto.DeploymentStepUpdateRequest;
import org.example.domain.deployment.dto.DeploymentUpdateRequest;
import org.example.domain.deployment.entity.Deployment;
import org.example.domain.deployment.entity.DeploymentRelatedRef;
import org.example.domain.deployment.entity.DeploymentStep;
import org.example.domain.deployment.mapper.DeploymentMapper;
import org.example.domain.deployment.repository.DeploymentRelatedRefRepository;
import org.example.domain.deployment.repository.DeploymentRepository;
import org.example.domain.deployment.repository.DeploymentStepRepository;
import org.example.domain.techTask.entity.TechTask;
import org.example.domain.techTask.repository.TechTaskRepository;
import org.example.domain.testScenario.entity.TestScenario;
import org.example.domain.testScenario.repository.TestScenarioRepository;
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
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;

@Service
@Transactional(readOnly = true)
public class DeploymentServiceImpl implements DeploymentService {

    private static final String REF_TYPE_WORK_REQUEST = "WORK_REQUEST";
    private static final String REF_TYPE_TECH_TASK = "TECH_TASK";
    private static final String REF_TYPE_TEST_SCENARIO = "TEST_SCENARIO";
    private static final String REF_TYPE_DEFECT = "DEFECT";
    private static final String REF_TYPE_DEPLOYMENT = "DEPLOYMENT";
    private static final String REF_TYPE_KNOWLEDGE_BASE = "KNOWLEDGE_BASE";

    private final DeploymentRepository deploymentRepository;
    private final DeploymentRelatedRefRepository deploymentRelatedRefRepository;
    private final DeploymentStepRepository deploymentStepRepository;
    private final WorkRequestRepository workRequestRepository;
    private final TechTaskRepository techTaskRepository;
    private final TestScenarioRepository testScenarioRepository;
    private final DefectRepository defectRepository;
    private final DocumentNoGenerator documentNoGenerator;
    private final NotificationEventService notificationEventService;
    private final DocumentIndexSyncService documentIndexSyncService;
    private final ActivityLogService activityLogService;

    public DeploymentServiceImpl(
            DeploymentRepository deploymentRepository,
            DeploymentRelatedRefRepository deploymentRelatedRefRepository,
            DeploymentStepRepository deploymentStepRepository,
            WorkRequestRepository workRequestRepository,
            TechTaskRepository techTaskRepository,
            TestScenarioRepository testScenarioRepository,
            DefectRepository defectRepository,
            DocumentNoGenerator documentNoGenerator,
            NotificationEventService notificationEventService,
            DocumentIndexSyncService documentIndexSyncService,
            @Nullable ActivityLogService activityLogService
    ) {
        this.deploymentRepository = deploymentRepository;
        this.deploymentRelatedRefRepository = deploymentRelatedRefRepository;
        this.deploymentStepRepository = deploymentStepRepository;
        this.workRequestRepository = workRequestRepository;
        this.techTaskRepository = techTaskRepository;
        this.testScenarioRepository = testScenarioRepository;
        this.defectRepository = defectRepository;
        this.documentNoGenerator = documentNoGenerator;
        this.notificationEventService = notificationEventService;
        this.documentIndexSyncService = documentIndexSyncService;
        this.activityLogService = activityLogService;
    }

    @Override
    public Page<DeploymentListResponse> findPage(int page, int size, DeploymentListQuery query) {
        PageRequest pageable = PageRequest.of(page, size, resolveSort(query));
        Long teamId = TeamScopeUtil.currentTeamId();

        Specification<Deployment> spec = Specification.where(byTeamId(teamId))
                .and(byKeyword(query == null ? null : query.q()))
                .and(byExact("type", query == null ? null : query.type()))
                .and(byExact("environment", query == null ? null : query.environment()))
                .and(byExact("status", query == null ? null : query.status()))
                .and(byManagerId(query == null ? null : query.managerId()))
                .and(byScheduledFrom(query == null ? null : query.scheduledFrom()))
                .and(byScheduledTo(query == null ? null : query.scheduledTo()));

        return deploymentRepository.findAll(spec, pageable).map(DeploymentMapper::toListResponse);
    }

    @Override
    public DeploymentDetailResponse findById(Long id) {
        Deployment deployment = getDeploymentOrThrow(id);
        return DeploymentMapper.toDetailResponse(deployment);
    }

    @Override
    @Transactional
    public Long create(DeploymentCreateRequest request) {
        validateCreateRequest(request);

        Deployment deployment = DeploymentMapper.fromCreateRequest(request);
        deployment.setDeployNo(documentNoGenerator.next("DP"));
        deployment.setTeamId(TeamScopeUtil.requireTeamId(request.teamId()));
        deployment.setType(normalizeType(request.type()));
        deployment.setEnvironment(normalizeEnvironment(request.environment()));
        deployment.setStatus(normalizeStatus(request.status()));
        deployment.setOverview(normalizeNullable(request.overview()));
        deployment.setRollbackPlan(normalizeNullable(request.rollbackPlan()));
        deployment.setStatusNote(normalizeNullable(request.statusNote()));

        Deployment saved = deploymentRepository.save(deployment);
        syncDocumentIndex(saved);

        if (request.relatedRefs() != null) {
            persistRelatedRefs(saved.getId(), request.relatedRefs());
        }
        if (request.steps() != null) {
            persistSteps(saved.getId(), request.steps());
        }

        recordCreated(saved);
        notifyManagerAssigned(saved);
        return saved.getId();
    }

    @Override
    @Transactional
    public void update(Long id, DeploymentUpdateRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "요청 본문이 비어 있습니다.");
        }

        Deployment deployment = getDeploymentOrThrow(id);
        Long previousManagerId = deployment.getManagerId();
        String previousStatus = deployment.getStatus();

        if (request.title() != null && request.title().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "title은 필수입니다.");
        }
        if (request.version() != null && request.version().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "version은 필수입니다.");
        }

        DeploymentMapper.applyUpdate(deployment, request);

        if (request.type() != null) {
            deployment.setType(normalizeType(request.type()));
        }
        if (request.environment() != null) {
            deployment.setEnvironment(normalizeEnvironment(request.environment()));
        }
        if (request.status() != null) {
            deployment.setStatus(normalizeStatus(request.status()));
        }
        if (request.overview() != null) {
            deployment.setOverview(normalizeNullable(request.overview()));
        }
        if (request.rollbackPlan() != null) {
            deployment.setRollbackPlan(normalizeNullable(request.rollbackPlan()));
        }
        if (request.statusNote() != null) {
            deployment.setStatusNote(normalizeNullable(request.statusNote()));
        }

        if (request.relatedRefs() != null) {
            persistRelatedRefs(id, request.relatedRefs());
        }
        if (request.steps() != null) {
            persistSteps(id, request.steps());
        }
        syncDocumentIndex(deployment);
        recordUpdated(deployment);
        recordManagerChanged(deployment, previousManagerId);
        recordStatusChanged(deployment, previousStatus);

        notifyManagerChanged(deployment, previousManagerId);
        notifyStatusChanged(deployment, previousStatus);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        Deployment deployment = getDeploymentOrThrow(id);

        recordDeleted(deployment);
        deploymentRelatedRefRepository.deleteByDeploymentId(id);
        deploymentStepRepository.deleteByDeploymentId(id);
        deploymentRepository.delete(deployment);
        deleteDocumentIndex(deployment);
    }

    @Override
    @Transactional
    public void updateStatus(Long id, DeploymentStatusUpdateRequest request) {
        if (request == null || isBlank(request.status())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "status는 필수입니다.");
        }

        Deployment deployment = getDeploymentOrThrow(id);
        String previousStatus = deployment.getStatus();
        deployment.setStatus(normalizeStatus(request.status()));
        deployment.setStatusNote(normalizeNullable(request.statusNote()));
        syncDocumentIndex(deployment);
        recordStatusChanged(deployment, previousStatus);

        notifyStatusChanged(deployment, previousStatus);
    }

    @Override
    public List<DeploymentRelatedRefResponse> getRelatedRefs(Long id) {
        ensureDeploymentExists(id);

        return deploymentRelatedRefRepository.findByDeploymentIdOrderBySortOrderAscIdAsc(id).stream()
                .map(ref -> {
                    RefMetadata metadata = resolveRefMetadata(ref.getRefType(), ref.getRefId());
                    return new DeploymentRelatedRefResponse(
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
    public void replaceRelatedRefs(Long id, DeploymentRelatedRefsUpdateRequest request) {
        ensureDeploymentExists(id);
        persistRelatedRefs(id, request == null ? List.of() : request.items());
    }

    @Override
    public List<DeploymentStepResponse> getSteps(Long id) {
        ensureDeploymentExists(id);

        return deploymentStepRepository.findByDeploymentIdOrderByStepOrderAscIdAsc(id).stream()
                .map(step -> new DeploymentStepResponse(
                        step.getId(),
                        step.getStepOrder(),
                        step.getContent(),
                        step.getIsDone(),
                        step.getCompletedAt()
                ))
                .toList();
    }

    @Override
    @Transactional
    public void replaceSteps(Long id, DeploymentStepsReplaceRequest request) {
        ensureDeploymentExists(id);
        persistSteps(id, request == null ? List.of() : request.steps());
    }

    @Override
    @Transactional
    public void updateStep(Long id, Long stepId, DeploymentStepUpdateRequest request) {
        if (request == null || request.isDone() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "isDone은 필수입니다.");
        }

        ensureDeploymentExists(id);

        DeploymentStep step = deploymentStepRepository.findByIdAndDeploymentId(stepId, id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "배포 절차를 찾을 수 없습니다."));

        boolean isDone = request.isDone();
        step.setIsDone(isDone);
        if (isDone) {
            if (step.getCompletedAt() == null) {
                step.setCompletedAt(LocalDateTime.now());
            }
        } else {
            step.setCompletedAt(null);
        }
    }

    private void validateCreateRequest(DeploymentCreateRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "요청 본문이 비어 있습니다.");
        }
        if (isBlank(request.title())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "title은 필수입니다.");
        }
        if (isBlank(request.version())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "version은 필수입니다.");
        }
        TeamScopeUtil.requireTeamId(request.teamId());
        if (request.scheduledAt() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "scheduledAt은 필수입니다.");
        }
    }

    private void persistRelatedRefs(Long deploymentId, List<DeploymentRelatedRefItemRequest> items) {
        deploymentRelatedRefRepository.deleteByDeploymentId(deploymentId);

        if (items == null || items.isEmpty()) {
            return;
        }

        List<DeploymentRelatedRefItemRequest> sortedItems = items.stream()
                .filter(item -> item != null)
                .sorted((a, b) -> {
                    int left = a.sortOrder() == null ? Integer.MAX_VALUE : a.sortOrder();
                    int right = b.sortOrder() == null ? Integer.MAX_VALUE : b.sortOrder();
                    return Integer.compare(left, right);
                })
                .toList();

        LinkedHashSet<String> seen = new LinkedHashSet<>();
        List<DeploymentRelatedRef> rows = new ArrayList<>();
        int stepOrder = 1;

        for (DeploymentRelatedRefItemRequest item : sortedItems) {
            if (item.refId() == null || isBlank(item.refType())) {
                continue;
            }

            String refType = normalizeRefType(item.refType());
            String uniqueKey = refType + ":" + item.refId();
            if (!seen.add(uniqueKey)) {
                continue;
            }

            DeploymentRelatedRef row = new DeploymentRelatedRef();
            row.setDeploymentId(deploymentId);
            row.setRefType(refType);
            row.setRefId(item.refId());
            row.setSortOrder(item.sortOrder() == null ? stepOrder : item.sortOrder());
            rows.add(row);
            stepOrder++;
        }

        if (!rows.isEmpty()) {
            deploymentRelatedRefRepository.saveAll(rows);
        }
    }

    private void persistSteps(Long deploymentId, List<String> steps) {
        deploymentStepRepository.deleteByDeploymentId(deploymentId);

        if (steps == null || steps.isEmpty()) {
            return;
        }

        List<DeploymentStep> rows = new ArrayList<>();
        int order = 1;
        for (String stepText : steps) {
            if (isBlank(stepText)) {
                continue;
            }

            DeploymentStep row = new DeploymentStep();
            row.setDeploymentId(deploymentId);
            row.setStepOrder(order++);
            row.setContent(stepText.trim());
            row.setIsDone(false);
            row.setCompletedAt(null);
            rows.add(row);
        }

        if (!rows.isEmpty()) {
            deploymentStepRepository.saveAll(rows);
        }
    }

    private Deployment getDeploymentOrThrow(Long id) {
        Deployment deployment = deploymentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "배포를 찾을 수 없습니다."));
        TeamScopeUtil.ensureAccessible(deployment.getTeamId());
        return deployment;
    }

    private void ensureDeploymentExists(Long id) {
        if (id == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "id는 필수입니다.");
        }
        getDeploymentOrThrow(id);
    }

    private Specification<Deployment> byTeamId(Long teamId) {
        if (teamId == null) {
            return null;
        }
        return (root, query, builder) -> builder.equal(root.get("teamId"), teamId);
    }

    private Specification<Deployment> byKeyword(String rawKeyword) {
        String keyword = normalizeNullable(rawKeyword);
        if (keyword == null) {
            return null;
        }

        return (root, query, builder) -> {
            String likeKeyword = "%" + keyword.toLowerCase(Locale.ROOT) + "%";
            return builder.or(
                    builder.like(builder.lower(root.get("title")), likeKeyword),
                    builder.like(builder.lower(root.get("deployNo")), likeKeyword),
                    builder.like(builder.lower(root.get("version")), likeKeyword)
            );
        };
    }

    private Specification<Deployment> byExact(String column, String rawValue) {
        String value = normalizeNullable(rawValue);
        if (value == null) {
            return null;
        }
        return (root, query, builder) -> builder.equal(root.get(column), value);
    }

    private Specification<Deployment> byManagerId(Long managerId) {
        if (managerId == null) {
            return null;
        }
        return (root, query, builder) -> builder.equal(root.get("managerId"), managerId);
    }

    private Specification<Deployment> byScheduledFrom(LocalDate scheduledFrom) {
        if (scheduledFrom == null) {
            return null;
        }
        return (root, query, builder) -> builder.greaterThanOrEqualTo(root.get("scheduledAt"), scheduledFrom);
    }

    private Specification<Deployment> byScheduledTo(LocalDate scheduledTo) {
        if (scheduledTo == null) {
            return null;
        }
        return (root, query, builder) -> builder.lessThanOrEqualTo(root.get("scheduledAt"), scheduledTo);
    }

    private Sort resolveSort(DeploymentListQuery query) {
        String requestedSortBy = normalizeNullable(query == null ? null : query.sortBy());
        String requestedSortDir = normalizeNullable(query == null ? null : query.sortDir());

        String sortBy = switch (requestedSortBy == null ? "" : requestedSortBy.toLowerCase(Locale.ROOT)) {
            case "docno", "deployno" -> "deployNo";
            case "title" -> "title";
            case "version" -> "version";
            case "type" -> "type";
            case "environment", "env" -> "environment";
            case "status" -> "status";
            case "manager", "managerid" -> "managerId";
            case "deploydate", "scheduledat" -> "scheduledAt";
            case "createdat" -> "createdAt";
            case "updatedat" -> "updatedAt";
            default -> "id";
        };

        Sort.Direction direction = "asc".equalsIgnoreCase(requestedSortDir) ? Sort.Direction.ASC : Sort.Direction.DESC;
        return Sort.by(direction, sortBy);
    }

    private String normalizeType(String type) {
        if (isBlank(type)) {
            return "정기배포";
        }

        String value = type.trim();
        return switch (value) {
            case "정기배포", "긴급패치", "핫픽스", "롤백", "기타" -> value;
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "유효하지 않은 type입니다.");
        };
    }

    private String normalizeEnvironment(String environment) {
        if (isBlank(environment)) {
            return "개발";
        }

        String value = environment.trim();
        return switch (value) {
            case "개발", "스테이징", "운영" -> value;
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "유효하지 않은 environment입니다.");
        };
    }

    private String normalizeStatus(String status) {
        if (isBlank(status)) {
            return "대기";
        }

        String value = status.trim();
        return switch (value) {
            case "대기", "진행중", "완료", "실패", "롤백" -> value;
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "유효하지 않은 status입니다.");
        };
    }

    private String normalizeRefType(String rawRefType) {
        String value = rawRefType.trim().toUpperCase(Locale.ROOT);
        return switch (value) {
            case REF_TYPE_WORK_REQUEST, REF_TYPE_TECH_TASK, REF_TYPE_TEST_SCENARIO, REF_TYPE_DEFECT,
                    REF_TYPE_DEPLOYMENT, REF_TYPE_KNOWLEDGE_BASE -> value;
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
            if (task != null) {
                return new RefMetadata(task.getTaskNo(), task.getTitle());
            }
        }

        if (REF_TYPE_TEST_SCENARIO.equals(normalizedRefType)) {
            TestScenario scenario = testScenarioRepository.findById(refId).orElse(null);
            if (scenario != null) {
                return new RefMetadata(scenario.getScenarioNo(), scenario.getTitle());
            }
        }

        if (REF_TYPE_DEFECT.equals(normalizedRefType)) {
            Defect defect = defectRepository.findById(refId).orElse(null);
            if (defect != null) {
                return new RefMetadata(defect.getDefectNo(), defect.getTitle());
            }
        }

        if (REF_TYPE_DEPLOYMENT.equals(normalizedRefType)) {
            Deployment deployment = deploymentRepository.findById(refId).orElse(null);
            if (deployment != null) {
                return new RefMetadata(deployment.getDeployNo(), deployment.getTitle());
            }
        }

        return new RefMetadata(toFallbackRefNo(normalizedRefType, refId), null);
    }

    private String toFallbackRefNo(String refType, Long refId) {
        String prefix = switch (refType) {
            case REF_TYPE_WORK_REQUEST -> "WR";
            case REF_TYPE_TECH_TASK -> "TK";
            case REF_TYPE_TEST_SCENARIO -> "TS";
            case REF_TYPE_DEFECT -> "DF";
            case REF_TYPE_DEPLOYMENT -> "DP";
            case REF_TYPE_KNOWLEDGE_BASE -> "KB";
            default -> "REF";
        };

        return prefix + "-" + refId;
    }

    private String normalizeNullable(String value) {
        return isBlank(value) ? null : value.trim();
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private void notifyManagerAssigned(Deployment entity) {
        if (notificationEventService == null) {
            return;
        }

        notificationEventService.create(
                entity.getManagerId(),
                "담당자배정",
                "배포 담당자 배정",
                entity.getDeployNo() + " '" + entity.getTitle() + "' 배포가 배정되었습니다.",
                REF_TYPE_DEPLOYMENT,
                entity.getId()
        );
    }

    private void notifyManagerChanged(Deployment entity, Long previousManagerId) {
        Long currentManagerId = entity.getManagerId();
        if (currentManagerId == null || currentManagerId.equals(previousManagerId)) {
            return;
        }

        notifyManagerAssigned(entity);
    }

    private void notifyStatusChanged(Deployment entity, String previousStatus) {
        if (notificationEventService == null) {
            return;
        }

        String currentStatus = entity.getStatus();
        if (currentStatus == null || currentStatus.equals(previousStatus)) {
            return;
        }

        String type = switch (currentStatus) {
            case "완료" -> "배포완료";
            case "실패" -> "배포실패";
            default -> "상태변경";
        };
        String title = switch (currentStatus) {
            case "완료" -> "배포 완료";
            case "실패" -> "배포 실패";
            default -> "배포 상태 변경";
        };

        notificationEventService.create(
                entity.getManagerId(),
                type,
                title,
                entity.getDeployNo() + " 상태가 '" + currentStatus + "'(으)로 변경되었습니다.",
                REF_TYPE_DEPLOYMENT,
                entity.getId()
        );
    }

    private void recordCreated(Deployment entity) {
        recordActivity(entity, "CREATED", null, null, null, entity.getDeployNo() + " 배포가 등록되었습니다.");
    }

    private void recordUpdated(Deployment entity) {
        recordActivity(entity, "UPDATED", null, null, null, entity.getDeployNo() + " 배포 내용이 수정되었습니다.");
    }

    private void recordStatusChanged(Deployment entity, String previousStatus) {
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
                entity.getDeployNo() + " 상태가 '" + currentStatus + "'(으)로 변경되었습니다."
        );
    }

    private void recordManagerChanged(Deployment entity, Long previousManagerId) {
        Long currentManagerId = entity.getManagerId();
        if ((previousManagerId == null && currentManagerId == null)
                || (previousManagerId != null && previousManagerId.equals(currentManagerId))) {
            return;
        }

        recordActivity(
                entity,
                "ASSIGNEE_CHANGED",
                "managerId",
                previousManagerId == null ? null : String.valueOf(previousManagerId),
                currentManagerId == null ? null : String.valueOf(currentManagerId),
                entity.getDeployNo() + " 담당자가 변경되었습니다."
        );
    }

    private void recordDeleted(Deployment entity) {
        recordActivity(entity, "DELETED", null, null, null, entity.getDeployNo() + " 배포가 삭제되었습니다.");
    }

    private void recordActivity(
            Deployment entity,
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
                    REF_TYPE_DEPLOYMENT,
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

    private void syncDocumentIndex(Deployment entity) {
        if (documentIndexSyncService == null) {
            return;
        }
        documentIndexSyncService.upsert(
                REF_TYPE_DEPLOYMENT,
                entity.getId(),
                entity.getTeamId(),
                entity.getDeployNo(),
                entity.getTitle(),
                entity.getStatus()
        );
    }

    private void deleteDocumentIndex(Deployment entity) {
        if (documentIndexSyncService == null) {
            return;
        }
        documentIndexSyncService.delete(
                REF_TYPE_DEPLOYMENT,
                entity.getId(),
                entity.getTeamId()
        );
    }
}
