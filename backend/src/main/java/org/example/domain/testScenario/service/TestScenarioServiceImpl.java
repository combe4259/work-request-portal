package org.example.domain.testScenario.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.domain.activityLog.service.ActivityLogCreateCommand;
import org.example.domain.activityLog.service.ActivityLogService;
import org.example.domain.documentIndex.service.DocumentIndexSyncService;
import org.example.domain.notification.service.NotificationEventService;
import org.example.domain.testScenario.dto.TestScenarioCreateRequest;
import org.example.domain.testScenario.dto.TestScenarioDetailResponse;
import org.example.domain.testScenario.dto.TestScenarioExecutionUpdateRequest;
import org.example.domain.testScenario.dto.TestScenarioListQuery;
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
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

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
    private final ObjectMapper objectMapper;

    public TestScenarioServiceImpl(
            TestScenarioRepository testScenarioRepository,
            TestScenarioRelatedRefRepository testScenarioRelatedRefRepository,
            DocumentNoGenerator documentNoGenerator,
            NotificationEventService notificationEventService,
            DocumentIndexSyncService documentIndexSyncService,
            @Nullable ActivityLogService activityLogService,
            ObjectMapper objectMapper
    ) {
        this.testScenarioRepository = testScenarioRepository;
        this.testScenarioRelatedRefRepository = testScenarioRelatedRefRepository;
        this.documentNoGenerator = documentNoGenerator;
        this.notificationEventService = notificationEventService;
        this.documentIndexSyncService = documentIndexSyncService;
        this.activityLogService = activityLogService;
        this.objectMapper = objectMapper;
    }

    @Override
    public Page<TestScenarioListResponse> findPage(int page, int size, TestScenarioListQuery query) {
        PageRequest pageable = PageRequest.of(page, size, resolveSort(query));
        Long teamId = TeamScopeUtil.currentTeamId();

        Specification<TestScenario> spec = Specification.where(byTeamId(teamId))
                .and(byKeyword(query == null ? null : query.q()))
                .and(byExact("type", query == null ? null : query.type()))
                .and(byExact("priority", query == null ? null : query.priority()))
                .and(byExact("status", query == null ? null : query.status()))
                .and(byAssigneeId(query == null ? null : query.assigneeId()))
                .and(byDeadlineFrom(query == null ? null : query.deadlineFrom()))
                .and(byDeadlineTo(query == null ? null : query.deadlineTo()));

        return testScenarioRepository.findAll(spec, pageable).map(TestScenarioMapper::toListResponse);
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
    @Transactional
    public void updateExecution(Long id, TestScenarioExecutionUpdateRequest request) {
        if (request == null || request.stepResults() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "stepResults는 필수입니다.");
        }

        TestScenario entity = testScenarioRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, TEST_SCENARIO_NOT_FOUND_MESSAGE));
        TeamScopeUtil.ensureAccessible(entity.getTeamId());

        String previousSteps = entity.getSteps();
        String previousActualResult = entity.getActualResult();
        var previousExecutedAt = entity.getExecutedAt();

        List<LinkedHashMap<String, Object>> steps = parseStepsForExecution(entity.getSteps());
        if (request.stepResults().size() != steps.size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "stepResults 개수와 steps 개수가 일치하지 않습니다.");
        }

        for (int index = 0; index < steps.size(); index++) {
            String normalized = normalizeExecutionStepResult(request.stepResults().get(index));
            steps.get(index).put("result", toStoredStepResult(normalized));
        }

        entity.setSteps(writeSteps(steps));
        if (request.actualResult() != null) {
            entity.setActualResult(normalizeNullable(request.actualResult()));
        }
        if (request.executedAt() != null) {
            entity.setExecutedAt(request.executedAt());
        }

        syncDocumentIndex(entity);
        recordExecutionUpdated(entity, previousSteps, previousActualResult, previousExecutedAt);
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

    private Specification<TestScenario> byTeamId(Long teamId) {
        if (teamId == null) {
            return null;
        }
        return (root, query, builder) -> builder.equal(root.get("teamId"), teamId);
    }

    private Specification<TestScenario> byKeyword(String rawKeyword) {
        String keyword = normalizeNullable(rawKeyword);
        if (keyword == null) {
            return null;
        }

        return (root, query, builder) -> {
            String likeKeyword = "%" + keyword.toLowerCase(Locale.ROOT) + "%";
            return builder.or(
                    builder.like(builder.lower(root.get("title")), likeKeyword),
                    builder.like(builder.lower(root.get("scenarioNo")), likeKeyword)
            );
        };
    }

    private Specification<TestScenario> byExact(String column, String rawValue) {
        String value = normalizeNullable(rawValue);
        if (value == null) {
            return null;
        }
        return (root, query, builder) -> builder.equal(root.get(column), value);
    }

    private Specification<TestScenario> byAssigneeId(Long assigneeId) {
        if (assigneeId == null) {
            return null;
        }
        return (root, query, builder) -> builder.equal(root.get("assigneeId"), assigneeId);
    }

    private Specification<TestScenario> byDeadlineFrom(LocalDate deadlineFrom) {
        if (deadlineFrom == null) {
            return null;
        }
        return (root, query, builder) -> builder.greaterThanOrEqualTo(root.get("deadline"), deadlineFrom);
    }

    private Specification<TestScenario> byDeadlineTo(LocalDate deadlineTo) {
        if (deadlineTo == null) {
            return null;
        }
        return (root, query, builder) -> builder.lessThanOrEqualTo(root.get("deadline"), deadlineTo);
    }

    private Sort resolveSort(TestScenarioListQuery query) {
        String requestedSortBy = normalizeNullable(query == null ? null : query.sortBy());
        String requestedSortDir = normalizeNullable(query == null ? null : query.sortDir());

        String sortBy = switch (requestedSortBy == null ? "" : requestedSortBy.toLowerCase(Locale.ROOT)) {
            case "docno", "scenariono" -> "scenarioNo";
            case "title" -> "title";
            case "type" -> "type";
            case "priority" -> "priority";
            case "status" -> "status";
            case "assignee", "assigneeid" -> "assigneeId";
            case "deadline" -> "deadline";
            case "executedat" -> "executedAt";
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

    private List<LinkedHashMap<String, Object>> parseStepsForExecution(String rawSteps) {
        String source = defaultIfBlank(rawSteps, "[]");
        try {
            List<Object> parsed = objectMapper.readValue(source, new TypeReference<>() {
            });
            List<LinkedHashMap<String, Object>> normalized = new ArrayList<>();

            for (Object node : parsed) {
                LinkedHashMap<String, Object> step = new LinkedHashMap<>();
                if (node instanceof String text) {
                    step.put("action", text.trim());
                    step.put("expected", "");
                    step.put("result", null);
                    normalized.add(step);
                    continue;
                }

                if (node instanceof Map<?, ?> rawMap) {
                    for (Map.Entry<?, ?> entry : rawMap.entrySet()) {
                        if (entry.getKey() instanceof String key) {
                            step.put(key, entry.getValue());
                        }
                    }
                    Object actionValue = step.get("action");
                    Object expectedValue = step.get("expected");
                    step.put("action", actionValue == null ? "" : String.valueOf(actionValue).trim());
                    step.put("expected", expectedValue == null ? "" : String.valueOf(expectedValue).trim());
                    step.put("result", normalizeStoredStepResult(step.get("result")));
                    normalized.add(step);
                    continue;
                }

                step.put("action", "");
                step.put("expected", "");
                step.put("result", null);
                normalized.add(step);
            }
            return normalized;
        } catch (JsonProcessingException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "steps 형식이 올바르지 않습니다.");
        }
    }

    private String normalizeExecutionStepResult(String value) {
        if (value == null || value.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "stepResults 값은 PASS, FAIL, SKIP 중 하나여야 합니다.");
        }

        String normalized = value.trim().toUpperCase(Locale.ROOT);
        return switch (normalized) {
            case "PASS", "FAIL", "SKIP" -> normalized;
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "stepResults 값은 PASS, FAIL, SKIP 중 하나여야 합니다.");
        };
    }

    private String toStoredStepResult(String value) {
        return switch (value) {
            case "PASS" -> "pass";
            case "FAIL" -> "fail";
            case "SKIP" -> null;
            default -> null;
        };
    }

    private String normalizeStoredStepResult(Object value) {
        if (value == null) {
            return null;
        }
        String normalized = String.valueOf(value).trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "pass" -> "pass";
            case "fail" -> "fail";
            case "skip" -> null;
            default -> null;
        };
    }

    private String writeSteps(List<LinkedHashMap<String, Object>> steps) {
        try {
            return objectMapper.writeValueAsString(steps);
        } catch (JsonProcessingException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "steps 형식이 올바르지 않습니다.");
        }
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

    private void recordExecutionUpdated(
            TestScenario entity,
            String previousSteps,
            String previousActualResult,
            LocalDateTime previousExecutedAt
    ) {
        boolean changed = !Objects.equals(previousSteps, entity.getSteps())
                || !Objects.equals(previousActualResult, entity.getActualResult())
                || !Objects.equals(previousExecutedAt, entity.getExecutedAt());
        if (!changed) {
            return;
        }

        recordActivity(
                entity,
                "EXECUTION_UPDATED",
                "execution",
                null,
                null,
                entity.getScenarioNo() + " 테스트 실행 결과가 업데이트되었습니다."
        );
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
