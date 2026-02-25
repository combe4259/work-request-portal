package org.example.domain.testScenario.service;

import org.example.domain.activityLog.service.ActivityLogCreateCommand;
import org.example.domain.activityLog.service.ActivityLogService;
import org.example.domain.documentIndex.service.DocumentIndexSyncService;
import org.example.domain.notification.service.NotificationEventService;
import org.example.domain.testScenario.dto.TestScenarioCreateRequest;
import org.example.domain.testScenario.dto.TestScenarioDetailResponse;
import org.example.domain.testScenario.dto.TestScenarioListResponse;
import org.example.domain.testScenario.dto.TestScenarioRelatedRefItemRequest;
import org.example.domain.testScenario.dto.TestScenarioRelatedRefResponse;
import org.example.domain.testScenario.dto.TestScenarioRelatedRefsUpdateRequest;
import org.example.domain.testScenario.dto.TestScenarioStatusUpdateRequest;
import org.example.domain.testScenario.dto.TestScenarioUpdateRequest;
import org.example.domain.testScenario.entity.TestScenario;
import org.example.domain.testScenario.entity.TestScenarioRelatedRef;
import org.example.domain.testScenario.mapper.TestScenarioMapper;
import org.example.domain.testScenario.repository.TestScenarioRelatedRefRepository;
import org.example.domain.testScenario.repository.TestScenarioRepository;
import org.example.global.team.TeamRequestContext;
import org.example.global.team.TeamScopeUtil;
import org.example.global.util.DocumentNoGenerator;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;

@Service
@Transactional(readOnly = true)
public class TestScenarioServiceImpl implements TestScenarioService {

    private static final String REF_TYPE_TEST_SCENARIO = "TEST_SCENARIO";
    private static final String TEST_SCENARIO_NOT_FOUND_MESSAGE = "테스트 시나리오를 찾을 수 없습니다.";

    private final TestScenarioRepository testScenarioRepository;
    private final TestScenarioRelatedRefRepository testScenarioRelatedRefRepository;
    private final DocumentNoGenerator documentNoGenerator;
    private final NotificationEventService notificationEventService;
    private final DocumentIndexSyncService documentIndexSyncService;
    private final ActivityLogService activityLogService;

    public TestScenarioServiceImpl(
            TestScenarioRepository testScenarioRepository,
            TestScenarioRelatedRefRepository testScenarioRelatedRefRepository,
            DocumentNoGenerator documentNoGenerator,
            NotificationEventService notificationEventService,
            DocumentIndexSyncService documentIndexSyncService,
            @Nullable ActivityLogService activityLogService
    ) {
        this.testScenarioRepository = testScenarioRepository;
        this.testScenarioRelatedRefRepository = testScenarioRelatedRefRepository;
        this.documentNoGenerator = documentNoGenerator;
        this.notificationEventService = notificationEventService;
        this.documentIndexSyncService = documentIndexSyncService;
        this.activityLogService = activityLogService;
    }

    @Override
    public Page<TestScenarioListResponse> findPage(int page, int size) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id"));
        Long teamId = TeamScopeUtil.currentTeamId();
        return (teamId == null
                ? testScenarioRepository.findAll(pageable)
                : testScenarioRepository.findByTeamId(teamId, pageable))
                .map(TestScenarioMapper::toListResponse);
    }

    @Override
    public TestScenarioDetailResponse findById(Long id) {
        TestScenario entity = testScenarioRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, TEST_SCENARIO_NOT_FOUND_MESSAGE));
        TeamScopeUtil.ensureAccessible(entity.getTeamId());
        return TestScenarioMapper.toDetailResponse(entity);
    }

    @Override
    @Transactional
    public Long create(TestScenarioCreateRequest request) {
        validateCreateRequest(request);

        TestScenario entity = TestScenarioMapper.fromCreateRequest(request);

        entity.setScenarioNo(documentNoGenerator.next("TS"));
        entity.setTeamId(TeamScopeUtil.requireTeamId(request.teamId()));
        entity.setType(defaultIfBlank(request.type(), "기능"));
        entity.setPriority(defaultIfBlank(request.priority(), "보통"));
        entity.setStatus(defaultIfBlank(request.status(), "작성중"));
        entity.setSteps(defaultIfBlank(request.steps(), "[]"));

        TestScenario saved = testScenarioRepository.save(entity);
        syncDocumentIndex(saved);
        recordCreated(saved);
        notifyAssigneeAssigned(saved);
        return saved.getId();
    }

    @Override
    @Transactional
    public void update(Long id, TestScenarioUpdateRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "요청 본문이 비어 있습니다.");
        }

        TestScenario entity = testScenarioRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, TEST_SCENARIO_NOT_FOUND_MESSAGE));
        TeamScopeUtil.ensureAccessible(entity.getTeamId());
        Long previousAssigneeId = entity.getAssigneeId();
        String previousStatus = entity.getStatus();

        if (request.title() != null && request.title().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "title은 필수입니다.");
        }

        TestScenarioMapper.applyUpdate(entity, request);

        if (request.type() != null) {
            entity.setType(defaultIfBlank(request.type(), entity.getType()));
        }
        if (request.priority() != null) {
            entity.setPriority(defaultIfBlank(request.priority(), entity.getPriority()));
        }
        if (request.status() != null) {
            entity.setStatus(defaultIfBlank(request.status(), entity.getStatus()));
        }
        if (request.steps() != null) {
            entity.setSteps(defaultIfBlank(request.steps(), "[]"));
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
        TestScenario entity = testScenarioRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, TEST_SCENARIO_NOT_FOUND_MESSAGE));
        TeamScopeUtil.ensureAccessible(entity.getTeamId());
        recordDeleted(entity);

        testScenarioRelatedRefRepository.deleteByTestScenarioId(id);
        testScenarioRepository.delete(entity);
        deleteDocumentIndex(entity);
    }

    @Override
    @Transactional
    public void updateStatus(Long id, TestScenarioStatusUpdateRequest request) {
        if (request == null || request.status() == null || request.status().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "status는 필수입니다.");
        }

        TestScenario entity = testScenarioRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, TEST_SCENARIO_NOT_FOUND_MESSAGE));
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

    @Override
    public List<TestScenarioRelatedRefResponse> getRelatedRefs(Long id) {
        ensureAccessibleTestScenario(id);

        return testScenarioRelatedRefRepository.findByTestScenarioIdOrderByIdAsc(id).stream()
                .map(ref -> new TestScenarioRelatedRefResponse(
                        ref.getRefType(),
                        ref.getRefId(),
                        toFallbackRefNo(ref.getRefType(), ref.getRefId()),
                        null
                ))
                .toList();
    }

    @Override
    @Transactional
    public void replaceRelatedRefs(Long id, TestScenarioRelatedRefsUpdateRequest request) {
        ensureAccessibleTestScenario(id);
        testScenarioRelatedRefRepository.deleteByTestScenarioId(id);

        if (request == null || request.items() == null || request.items().isEmpty()) {
            return;
        }

        List<TestScenarioRelatedRefItemRequest> sortedItems = request.items().stream()
                .filter(item -> item != null)
                .sorted((a, b) -> {
                    int left = a.sortOrder() == null ? Integer.MAX_VALUE : a.sortOrder();
                    int right = b.sortOrder() == null ? Integer.MAX_VALUE : b.sortOrder();
                    return Integer.compare(left, right);
                })
                .toList();

        LinkedHashSet<String> seen = new LinkedHashSet<>();
        List<TestScenarioRelatedRef> rows = new ArrayList<>();
        for (TestScenarioRelatedRefItemRequest item : sortedItems) {
            if (item.refId() == null || isBlank(item.refType())) {
                continue;
            }

            String normalizedRefType = normalizeRefType(item.refType());
            String uniqueKey = normalizedRefType + ":" + item.refId();
            if (!seen.add(uniqueKey)) {
                continue;
            }

            TestScenarioRelatedRef row = new TestScenarioRelatedRef();
            row.setTestScenarioId(id);
            row.setRefType(normalizedRefType);
            row.setRefId(item.refId());
            rows.add(row);
        }

        if (!rows.isEmpty()) {
            testScenarioRelatedRefRepository.saveAll(rows);
        }
    }

    private void validateCreateRequest(TestScenarioCreateRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "요청 본문이 비어 있습니다.");
        }
        if (request.title() == null || request.title().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "title은 필수입니다.");
        }
        TeamScopeUtil.requireTeamId(request.teamId());
        if (request.createdBy() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "createdBy는 필수입니다.");
        }
        if (request.deadline() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "deadline은 필수입니다.");
        }
    }

    private void ensureAccessibleTestScenario(Long id) {
        TestScenario entity = testScenarioRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, TEST_SCENARIO_NOT_FOUND_MESSAGE));
        TeamScopeUtil.ensureAccessible(entity.getTeamId());
    }

    private String normalizeRefType(String rawRefType) {
        String value = rawRefType.trim().toUpperCase(Locale.ROOT);
        return switch (value) {
            case "WORK_REQUEST", "TECH_TASK", REF_TYPE_TEST_SCENARIO, "DEFECT", "DEPLOYMENT" -> value;
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "유효하지 않은 refType입니다.");
        };
    }

    private String toFallbackRefNo(String refType, Long refId) {
        String prefix = switch (refType) {
            case "WORK_REQUEST" -> "WR";
            case "TECH_TASK" -> "TK";
            case REF_TYPE_TEST_SCENARIO -> "TS";
            case "DEFECT" -> "DF";
            case "DEPLOYMENT" -> "DP";
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
        return value.trim();
    }

    private String normalizeNullable(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private void notifyAssigneeAssigned(TestScenario entity) {
        if (notificationEventService == null) {
            return;
        }

        notificationEventService.create(
                entity.getAssigneeId(),
                "담당자배정",
                "테스트 시나리오 배정",
                entity.getScenarioNo() + " '" + entity.getTitle() + "' 시나리오가 배정되었습니다.",
                REF_TYPE_TEST_SCENARIO,
                entity.getId()
        );
    }

    private void notifyAssigneeChanged(TestScenario entity, Long previousAssigneeId) {
        Long currentAssigneeId = entity.getAssigneeId();
        if (currentAssigneeId == null || currentAssigneeId.equals(previousAssigneeId)) {
            return;
        }

        notifyAssigneeAssigned(entity);
    }

    private void notifyStatusChanged(TestScenario entity, String previousStatus) {
        if (notificationEventService == null) {
            return;
        }

        String currentStatus = entity.getStatus();
        if (currentStatus == null || currentStatus.equals(previousStatus)) {
            return;
        }

        notificationEventService.create(
                entity.getCreatedBy(),
                "상태변경",
                "테스트 시나리오 상태 변경",
                entity.getScenarioNo() + " 상태가 '" + currentStatus + "'(으)로 변경되었습니다.",
                REF_TYPE_TEST_SCENARIO,
                entity.getId()
        );
    }

    private void recordCreated(TestScenario entity) {
        recordActivity(entity, "CREATED", null, null, null, entity.getScenarioNo() + " 테스트 시나리오가 등록되었습니다.");
    }

    private void recordUpdated(TestScenario entity) {
        recordActivity(entity, "UPDATED", null, null, null, entity.getScenarioNo() + " 테스트 시나리오 내용이 수정되었습니다.");
    }

    private void recordStatusChanged(TestScenario entity, String previousStatus) {
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
                entity.getScenarioNo() + " 상태가 '" + currentStatus + "'(으)로 변경되었습니다."
        );
    }

    private void recordAssigneeChanged(TestScenario entity, Long previousAssigneeId) {
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
                entity.getScenarioNo() + " 담당자가 변경되었습니다."
        );
    }

    private void recordDeleted(TestScenario entity) {
        recordActivity(entity, "DELETED", null, null, null, entity.getScenarioNo() + " 테스트 시나리오가 삭제되었습니다.");
    }

    private void recordActivity(
            TestScenario entity,
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
                    REF_TYPE_TEST_SCENARIO,
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

    private void syncDocumentIndex(TestScenario entity) {
        if (documentIndexSyncService == null) {
            return;
        }
        documentIndexSyncService.upsert(
                REF_TYPE_TEST_SCENARIO,
                entity.getId(),
                entity.getTeamId(),
                entity.getScenarioNo(),
                entity.getTitle(),
                entity.getStatus()
        );
    }

    private void deleteDocumentIndex(TestScenario entity) {
        if (documentIndexSyncService == null) {
            return;
        }
        documentIndexSyncService.delete(
                REF_TYPE_TEST_SCENARIO,
                entity.getId(),
                entity.getTeamId()
        );
    }
}
