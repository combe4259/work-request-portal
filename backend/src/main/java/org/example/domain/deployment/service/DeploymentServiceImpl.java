package org.example.domain.deployment.service;

import org.example.domain.defect.entity.Defect;
import org.example.domain.defect.repository.DefectRepository;
import org.example.domain.deployment.dto.DeploymentCreateRequest;
import org.example.domain.deployment.dto.DeploymentDetailResponse;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;

@Service
@Transactional(readOnly = true)
public class DeploymentServiceImpl implements DeploymentService {

    private final DeploymentRepository deploymentRepository;
    private final DeploymentRelatedRefRepository deploymentRelatedRefRepository;
    private final DeploymentStepRepository deploymentStepRepository;
    private final WorkRequestRepository workRequestRepository;
    private final TechTaskRepository techTaskRepository;
    private final TestScenarioRepository testScenarioRepository;
    private final DefectRepository defectRepository;

    public DeploymentServiceImpl(
            DeploymentRepository deploymentRepository,
            DeploymentRelatedRefRepository deploymentRelatedRefRepository,
            DeploymentStepRepository deploymentStepRepository,
            WorkRequestRepository workRequestRepository,
            TechTaskRepository techTaskRepository,
            TestScenarioRepository testScenarioRepository,
            DefectRepository defectRepository
    ) {
        this.deploymentRepository = deploymentRepository;
        this.deploymentRelatedRefRepository = deploymentRelatedRefRepository;
        this.deploymentStepRepository = deploymentStepRepository;
        this.workRequestRepository = workRequestRepository;
        this.techTaskRepository = techTaskRepository;
        this.testScenarioRepository = testScenarioRepository;
        this.defectRepository = defectRepository;
    }

    @Override
    public Page<DeploymentListResponse> findPage(int page, int size) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id"));
        return deploymentRepository.findAll(pageable)
                .map(DeploymentMapper::toListResponse);
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
        deployment.setDeployNo("DP-" + System.currentTimeMillis());
        deployment.setType(normalizeType(request.type()));
        deployment.setEnvironment(normalizeEnvironment(request.environment()));
        deployment.setStatus(normalizeStatus(request.status()));
        deployment.setOverview(normalizeNullable(request.overview()));
        deployment.setRollbackPlan(normalizeNullable(request.rollbackPlan()));
        deployment.setStatusNote(normalizeNullable(request.statusNote()));

        Deployment saved = deploymentRepository.save(deployment);

        if (request.relatedRefs() != null) {
            persistRelatedRefs(saved.getId(), request.relatedRefs());
        }
        if (request.steps() != null) {
            persistSteps(saved.getId(), request.steps());
        }

        return saved.getId();
    }

    @Override
    @Transactional
    public void update(Long id, DeploymentUpdateRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "요청 본문이 비어 있습니다.");
        }

        Deployment deployment = getDeploymentOrThrow(id);

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
    }

    @Override
    @Transactional
    public void updateStatus(Long id, DeploymentStatusUpdateRequest request) {
        if (request == null || isBlank(request.status())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "status는 필수입니다.");
        }

        Deployment deployment = getDeploymentOrThrow(id);
        deployment.setStatus(normalizeStatus(request.status()));
        deployment.setStatusNote(normalizeNullable(request.statusNote()));
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

        step.setIsDone(request.isDone());
        if (request.isDone()) {
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
        if (request.teamId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "teamId는 필수입니다.");
        }
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
        return deploymentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "배포를 찾을 수 없습니다."));
    }

    private void ensureDeploymentExists(Long id) {
        if (id == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "id는 필수입니다.");
        }
        if (!deploymentRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "배포를 찾을 수 없습니다.");
        }
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
            case "WORK_REQUEST", "TECH_TASK", "TEST_SCENARIO", "DEFECT", "DEPLOYMENT", "KNOWLEDGE_BASE" -> value;
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
            if (task != null) {
                return new RefMetadata(task.getTaskNo(), task.getTitle());
            }
        }

        if ("TEST_SCENARIO".equals(normalizedRefType)) {
            TestScenario scenario = testScenarioRepository.findById(refId).orElse(null);
            if (scenario != null) {
                return new RefMetadata(scenario.getScenarioNo(), scenario.getTitle());
            }
        }

        if ("DEFECT".equals(normalizedRefType)) {
            Defect defect = defectRepository.findById(refId).orElse(null);
            if (defect != null) {
                return new RefMetadata(defect.getDefectNo(), defect.getTitle());
            }
        }

        if ("DEPLOYMENT".equals(normalizedRefType)) {
            Deployment deployment = deploymentRepository.findById(refId).orElse(null);
            if (deployment != null) {
                return new RefMetadata(deployment.getDeployNo(), deployment.getTitle());
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
            case "KNOWLEDGE_BASE" -> "KB";
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

    private record RefMetadata(String refNo, String title) {
    }
}
