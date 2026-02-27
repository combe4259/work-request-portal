package org.example.domain.flow.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import org.example.domain.deployment.entity.Deployment;
import org.example.domain.deployment.entity.DeploymentRelatedRef;
import org.example.domain.deployment.repository.DeploymentRelatedRefRepository;
import org.example.domain.deployment.repository.DeploymentRepository;
import org.example.domain.flow.dto.FlowChainResponse;
import org.example.domain.flow.dto.FlowItemCreateRequest;
import org.example.domain.flow.dto.FlowItemCreateResponse;
import org.example.domain.flow.dto.FlowUiStateRequest;
import org.example.domain.flow.dto.FlowUiStateResponse;
import org.example.domain.flow.entity.FlowUiState;
import org.example.domain.flow.realtime.FlowUiRealtimeService;
import org.example.domain.flow.repository.FlowUiStateRepository;
import org.example.domain.techTask.entity.TechTask;
import org.example.domain.techTask.entity.TechTaskRelatedRef;
import org.example.domain.techTask.repository.TechTaskRelatedRefRepository;
import org.example.domain.techTask.repository.TechTaskRepository;
import org.example.domain.testScenario.entity.TestScenario;
import org.example.domain.testScenario.entity.TestScenarioRelatedRef;
import org.example.domain.testScenario.repository.TestScenarioRelatedRefRepository;
import org.example.domain.testScenario.repository.TestScenarioRepository;
import org.example.domain.user.repository.PortalUserRepository;
import org.example.domain.workRequest.entity.WorkRequest;
import org.example.domain.workRequest.entity.WorkRequestRelatedRef;
import org.example.domain.workRequest.repository.WorkRequestRelatedRefRepository;
import org.example.domain.workRequest.repository.WorkRequestRepository;
import org.example.global.security.JwtTokenProvider;
import org.example.global.team.TeamRequestContext;
import org.example.global.team.TeamScopeUtil;
import org.example.global.util.DocumentNoGenerator;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;

@Service
@Transactional(readOnly = true)
public class FlowChainService {

    private static final String PARENT_TYPE_WORK_REQUEST = "WORK_REQUEST";
    private static final String PARENT_TYPE_TECH_TASK = "TECH_TASK";
    private static final String ITEM_TYPE_TECH_TASK = "TECH_TASK";
    private static final String ITEM_TYPE_TEST_SCENARIO = "TEST_SCENARIO";
    private static final String ITEM_TYPE_DEPLOYMENT = "DEPLOYMENT";
    private static final String UI_NODE_TYPE_DEFECT = "DEFECT";
    private static final String UI_NODE_TYPE_KNOWLEDGE_BASE = "KNOWLEDGE_BASE";
    private static final int MAX_CREATE_TITLE_LENGTH = 200;
    private static final int MAX_UI_POSITIONS = 600;
    private static final int MAX_UI_EDGES = 1000;
    private static final int MAX_UI_CUSTOM_NODES = 400;

    private final WorkRequestRepository workRequestRepository;
    private final WorkRequestRelatedRefRepository workRequestRelatedRefRepository;
    private final TechTaskRepository techTaskRepository;
    private final TechTaskRelatedRefRepository techTaskRelatedRefRepository;
    private final TestScenarioRepository testScenarioRepository;
    private final TestScenarioRelatedRefRepository testScenarioRelatedRefRepository;
    private final DeploymentRepository deploymentRepository;
    private final DeploymentRelatedRefRepository deploymentRelatedRefRepository;
    private final FlowUiStateRepository flowUiStateRepository;
    private final FlowUiRealtimeService flowUiRealtimeService;
    private final PortalUserRepository portalUserRepository;
    private final DocumentNoGenerator documentNoGenerator;
    private final ObjectMapper objectMapper;
    private final JwtTokenProvider jwtTokenProvider;

    public FlowChainService(
            WorkRequestRepository workRequestRepository,
            WorkRequestRelatedRefRepository workRequestRelatedRefRepository,
            TechTaskRepository techTaskRepository,
            TechTaskRelatedRefRepository techTaskRelatedRefRepository,
            TestScenarioRepository testScenarioRepository,
            TestScenarioRelatedRefRepository testScenarioRelatedRefRepository,
            DeploymentRepository deploymentRepository,
            DeploymentRelatedRefRepository deploymentRelatedRefRepository,
            FlowUiStateRepository flowUiStateRepository,
            FlowUiRealtimeService flowUiRealtimeService,
            PortalUserRepository portalUserRepository,
            DocumentNoGenerator documentNoGenerator,
            ObjectMapper objectMapper,
            JwtTokenProvider jwtTokenProvider
    ) {
        this.workRequestRepository = workRequestRepository;
        this.workRequestRelatedRefRepository = workRequestRelatedRefRepository;
        this.techTaskRepository = techTaskRepository;
        this.techTaskRelatedRefRepository = techTaskRelatedRefRepository;
        this.testScenarioRepository = testScenarioRepository;
        this.testScenarioRelatedRefRepository = testScenarioRelatedRefRepository;
        this.deploymentRepository = deploymentRepository;
        this.deploymentRelatedRefRepository = deploymentRelatedRefRepository;
        this.flowUiStateRepository = flowUiStateRepository;
        this.flowUiRealtimeService = flowUiRealtimeService;
        this.portalUserRepository = portalUserRepository;
        this.documentNoGenerator = documentNoGenerator;
        this.objectMapper = objectMapper;
        this.jwtTokenProvider = jwtTokenProvider;
    }

    public FlowChainResponse getFlowChain(Long workRequestId) {
        WorkRequest wr = getAccessibleWorkRequest(workRequestId);

        // 1. Collect linked IDs from WR refs
        List<WorkRequestRelatedRef> wrRefs = workRequestRelatedRefRepository
                .findByWorkRequestIdOrderBySortOrderAscIdAsc(workRequestId);

        List<Long> ttIds = wrRefs.stream()
                .filter(r -> "TECH_TASK".equals(r.getRefType())).map(WorkRequestRelatedRef::getRefId).toList();
        List<Long> directTsIds = wrRefs.stream()
                .filter(r -> "TEST_SCENARIO".equals(r.getRefType())).map(WorkRequestRelatedRef::getRefId).toList();
        List<Long> directDpIds = wrRefs.stream()
                .filter(r -> "DEPLOYMENT".equals(r.getRefType())).map(WorkRequestRelatedRef::getRefId).toList();

        // 2. Load tech tasks and their children
        Map<Long, TechTask> techTaskMap = new HashMap<>();
        techTaskRepository.findAllById(ttIds).forEach(tt -> techTaskMap.put(tt.getId(), tt));

        Map<Long, List<Long>> ttToTsIds = new HashMap<>();
        Map<Long, List<Long>> ttToDpIds = new HashMap<>();
        for (Long ttId : ttIds) {
            List<TechTaskRelatedRef> refs = techTaskRelatedRefRepository.findByTechTaskIdOrderByIdAsc(ttId);
            ttToTsIds.put(ttId, refs.stream().filter(r -> "TEST_SCENARIO".equals(r.getRefType()))
                    .map(TechTaskRelatedRef::getRefId).toList());
            ttToDpIds.put(ttId, refs.stream().filter(r -> "DEPLOYMENT".equals(r.getRefType()))
                    .map(TechTaskRelatedRef::getRefId).toList());
        }

        // 3. Collect & batch-load all TS and DP entities
        Set<Long> allTsIds = new HashSet<>(directTsIds);
        ttToTsIds.values().forEach(allTsIds::addAll);
        Set<Long> allDpIds = new HashSet<>(directDpIds);
        ttToDpIds.values().forEach(allDpIds::addAll);

        Map<Long, TestScenario> tsMap = new HashMap<>();
        testScenarioRepository.findAllById(allTsIds).forEach(ts -> tsMap.put(ts.getId(), ts));
        Map<Long, Deployment> dpMap = new HashMap<>();
        deploymentRepository.findAllById(allDpIds).forEach(dp -> dpMap.put(dp.getId(), dp));

        // 4. Batch-load user names
        Set<Long> userIds = new HashSet<>();
        if (wr.getAssigneeId() != null) userIds.add(wr.getAssigneeId());
        techTaskMap.values().forEach(tt -> { if (tt.getAssigneeId() != null) userIds.add(tt.getAssigneeId()); });
        tsMap.values().forEach(ts -> { if (ts.getAssigneeId() != null) userIds.add(ts.getAssigneeId()); });

        Map<Long, String> userNames = new HashMap<>();
        portalUserRepository.findAllById(userIds).forEach(u -> userNames.put(u.getId(), u.getName()));

        // 5. Build nodes and edges
        List<FlowChainResponse.FlowNode> nodes = new ArrayList<>();
        List<FlowChainResponse.FlowEdge> edges = new ArrayList<>();
        Set<String> addedNodeIds = new HashSet<>();

        String wrNodeId = "WR-" + wr.getId();
        nodes.add(new FlowChainResponse.FlowNode(
                wrNodeId, wr.getId(), "WORK_REQUEST",
                wr.getRequestNo(), wr.getTitle(), wr.getStatus(),
                wr.getPriority(), userNames.get(wr.getAssigneeId()), null));
        addedNodeIds.add(wrNodeId);

        // TechTask nodes + WR→TT edges
        for (Long ttId : ttIds) {
            TechTask tt = techTaskMap.get(ttId);
            if (tt == null) continue;
            String ttNodeId = "TT-" + tt.getId();
            if (!addedNodeIds.contains(ttNodeId)) {
                nodes.add(new FlowChainResponse.FlowNode(
                        ttNodeId, tt.getId(), "TECH_TASK",
                        tt.getTaskNo(), tt.getTitle(), tt.getStatus(),
                        tt.getPriority(), userNames.get(tt.getAssigneeId()), null));
                addedNodeIds.add(ttNodeId);
            }
            edges.add(new FlowChainResponse.FlowEdge("edge-" + wrNodeId + "-" + ttNodeId, wrNodeId, ttNodeId));

            // TS children of TT
            for (Long tsId : ttToTsIds.getOrDefault(ttId, List.of())) {
                TestScenario ts = tsMap.get(tsId);
                if (ts == null) continue;
                String tsNodeId = "TS-" + ts.getId();
                if (!addedNodeIds.contains(tsNodeId)) {
                    nodes.add(new FlowChainResponse.FlowNode(
                            tsNodeId, ts.getId(), "TEST_SCENARIO",
                            ts.getScenarioNo(), ts.getTitle(), ts.getStatus(),
                            ts.getPriority(), userNames.get(ts.getAssigneeId()), null));
                    addedNodeIds.add(tsNodeId);
                }
                edges.add(new FlowChainResponse.FlowEdge("edge-" + ttNodeId + "-" + tsNodeId, ttNodeId, tsNodeId));
            }

            // DP children of TT
            for (Long dpId : ttToDpIds.getOrDefault(ttId, List.of())) {
                Deployment dp = dpMap.get(dpId);
                if (dp == null) continue;
                String dpNodeId = "DP-" + dp.getId();
                if (!addedNodeIds.contains(dpNodeId)) {
                    nodes.add(new FlowChainResponse.FlowNode(
                            dpNodeId, dp.getId(), "DEPLOYMENT",
                            dp.getDeployNo(), dp.getTitle(), dp.getStatus(),
                            null, null, dp.getVersion()));
                    addedNodeIds.add(dpNodeId);
                }
                edges.add(new FlowChainResponse.FlowEdge("edge-" + ttNodeId + "-" + dpNodeId, ttNodeId, dpNodeId));
            }
        }

        // Direct TS nodes (WR → TS without TT)
        for (Long tsId : directTsIds) {
            TestScenario ts = tsMap.get(tsId);
            if (ts == null) continue;
            String tsNodeId = "TS-" + ts.getId();
            if (!addedNodeIds.contains(tsNodeId)) {
                nodes.add(new FlowChainResponse.FlowNode(
                        tsNodeId, ts.getId(), "TEST_SCENARIO",
                        ts.getScenarioNo(), ts.getTitle(), ts.getStatus(),
                        ts.getPriority(), userNames.get(ts.getAssigneeId()), null));
                addedNodeIds.add(tsNodeId);
            }
            edges.add(new FlowChainResponse.FlowEdge("edge-" + wrNodeId + "-" + tsNodeId, wrNodeId, tsNodeId));
        }

        // Direct DP nodes (WR → DP without TT)
        for (Long dpId : directDpIds) {
            Deployment dp = dpMap.get(dpId);
            if (dp == null) continue;
            String dpNodeId = "DP-" + dp.getId();
            if (!addedNodeIds.contains(dpNodeId)) {
                nodes.add(new FlowChainResponse.FlowNode(
                        dpNodeId, dp.getId(), "DEPLOYMENT",
                        dp.getDeployNo(), dp.getTitle(), dp.getStatus(),
                        null, null, dp.getVersion()));
                addedNodeIds.add(dpNodeId);
            }
            edges.add(new FlowChainResponse.FlowEdge("edge-" + wrNodeId + "-" + dpNodeId, wrNodeId, dpNodeId));
        }

        return new FlowChainResponse(nodes, edges);
    }

    public FlowUiStateResponse getFlowUiState(Long workRequestId) {
        getAccessibleWorkRequest(workRequestId);
        Long userId = requireCurrentUserId();

        return flowUiStateRepository.findByWorkRequestIdAndUserId(workRequestId, userId)
                .map(state -> {
                    FlowUiStateResponse normalized = deserializeFlowUiState(state.getStateJson());
                    return new FlowUiStateResponse(
                            sanitizeVersion(state.getVersion()),
                            normalized.positions(),
                            normalized.edges(),
                            normalized.customNodes()
                    );
                })
                .orElse(FlowUiStateResponse.empty());
    }

    @Transactional
    public void saveFlowUiState(Long workRequestId, FlowUiStateRequest request) {
        if (request == null || request.expectedVersion() == null || request.expectedVersion() < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "expectedVersion은 0 이상의 값이 필요합니다.");
        }

        WorkRequest workRequest = getAccessibleWorkRequest(workRequestId);
        Long userId = requireCurrentUserId();
        Optional<FlowUiState> existingState = flowUiStateRepository.findByWorkRequestIdAndUserId(workRequestId, userId);
        long currentVersion = existingState.map(state -> sanitizeVersion(state.getVersion())).orElse(0L);

        if (!Objects.equals(request.expectedVersion(), currentVersion)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "워크플로우 UI 상태가 최신이 아닙니다. expectedVersion=" + request.expectedVersion()
                            + ", currentVersion=" + currentVersion
            );
        }

        FlowUiStateResponse normalized = normalizeFlowUiState(request);
        String stateJson = serializeFlowUiState(normalized);

        FlowUiState state = existingState.orElseGet(FlowUiState::new);

        state.setWorkRequestId(workRequestId);
        state.setUserId(userId);
        state.setTeamId(workRequest.getTeamId());
        state.setStateJson(stateJson);
        state.setVersion(currentVersion + 1);
        flowUiStateRepository.save(state);
        flowUiRealtimeService.publishUpdated(workRequestId, userId);
    }

    @Transactional
    public FlowItemCreateResponse createFlowItem(Long workRequestId, FlowItemCreateRequest request) {
        WorkRequest wr = getAccessibleWorkRequest(workRequestId);
        FlowItemCreateRequest normalizedRequest = normalizeCreateRequest(request);
        validateCreateRequest(wr, normalizedRequest);

        Long teamId = wr.getTeamId();
        Long registrantId = wr.getRequesterId() != null ? wr.getRequesterId() : 1L;

        return switch (normalizedRequest.itemType()) {
            case ITEM_TYPE_TECH_TASK -> createTechTask(wr, teamId, registrantId, normalizedRequest);
            case ITEM_TYPE_TEST_SCENARIO -> createTestScenario(wr, teamId, registrantId, normalizedRequest);
            case ITEM_TYPE_DEPLOYMENT -> createDeployment(wr, teamId, registrantId, normalizedRequest);
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported itemType: " + normalizedRequest.itemType());
        };
    }

    private FlowItemCreateRequest normalizeCreateRequest(FlowItemCreateRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Request body is required");
        }

        String title = request.title() == null ? "" : request.title().trim();
        if (title.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Title is required");
        }
        if (title.length() > MAX_CREATE_TITLE_LENGTH) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Title length must be 200 characters or less");
        }

        if (request.parentType() == null || request.parentId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "parentType and parentId are required");
        }
        if (request.itemType() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "itemType is required");
        }

        String parentType = normalizeParentType(request.parentType());
        String itemType = normalizeItemType(request.itemType());
        if (parentType == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported parentType: " + request.parentType());
        }
        if (itemType == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported itemType: " + request.itemType());
        }
        if (request.parentId() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "parentId must be a positive number");
        }

        return new FlowItemCreateRequest(parentType, request.parentId(), itemType, title);
    }

    private void validateCreateRequest(WorkRequest workRequest, FlowItemCreateRequest request) {
        validateParentChildRule(request.parentType(), request.itemType());

        switch (request.parentType()) {
            case PARENT_TYPE_WORK_REQUEST -> {
                if (!workRequest.getId().equals(request.parentId())) {
                    throw new ResponseStatusException(
                            HttpStatus.BAD_REQUEST,
                            "For WORK_REQUEST parentType, parentId must match path workRequestId"
                    );
                }
            }
            case PARENT_TYPE_TECH_TASK -> {
                TechTask parentTechTask = techTaskRepository.findById(request.parentId())
                        .orElseThrow(() -> new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "TechTask parent not found: " + request.parentId()
                        ));
                TeamScopeUtil.ensureAccessible(parentTechTask.getTeamId());

                if (!Objects.equals(parentTechTask.getTeamId(), workRequest.getTeamId())) {
                    throw new ResponseStatusException(
                            HttpStatus.BAD_REQUEST,
                            "Parent tech task is not in the same team as target work request"
                    );
                }

                boolean linkedToWorkRequest = workRequestRelatedRefRepository
                        .existsByWorkRequestIdAndRefTypeAndRefId(workRequest.getId(), ITEM_TYPE_TECH_TASK, parentTechTask.getId())
                        || techTaskRelatedRefRepository
                        .existsByTechTaskIdAndRefTypeAndRefId(parentTechTask.getId(), PARENT_TYPE_WORK_REQUEST, workRequest.getId());
                if (!linkedToWorkRequest) {
                    throw new ResponseStatusException(
                            HttpStatus.BAD_REQUEST,
                            "Parent tech task is not connected to target work request"
                    );
                }
            }
            default -> throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Unsupported parentType: " + request.parentType()
            );
        }
    }

    private FlowItemCreateResponse createTechTask(WorkRequest wr, Long teamId, Long registrantId, FlowItemCreateRequest req) {
        TechTask tt = new TechTask();
        tt.setTaskNo(documentNoGenerator.next("TK"));
        tt.setTitle(req.title());
        tt.setCurrentIssue("");
        tt.setSolution("");
        tt.setType("기타");
        tt.setPriority("보통");
        tt.setStatus("접수대기");
        tt.setTeamId(teamId);
        tt.setRegistrantId(registrantId);
        TechTask saved = techTaskRepository.save(tt);

        String ttNodeId = "TT-" + saved.getId();
        String parentNodeId = resolveParentNodeId(req);
        linkRelatedRefs(wr.getId(), req, saved.getId(), "TECH_TASK");

        return new FlowItemCreateResponse(
                ttNodeId, saved.getId(), "TECH_TASK",
                saved.getTaskNo(), saved.getTitle(), saved.getStatus(),
                "edge-" + parentNodeId + "-" + ttNodeId, parentNodeId, ttNodeId);
    }

    private FlowItemCreateResponse createTestScenario(WorkRequest wr, Long teamId, Long registrantId, FlowItemCreateRequest req) {
        TestScenario ts = new TestScenario();
        ts.setScenarioNo(documentNoGenerator.next("TS"));
        ts.setTitle(req.title());
        ts.setDescription("");
        ts.setType("기능");
        ts.setPriority("보통");
        ts.setStatus("작성중");
        ts.setSteps("[]");
        ts.setDeadline(LocalDate.now().plusDays(7));
        ts.setTeamId(teamId);
        ts.setCreatedBy(registrantId);
        TestScenario saved = testScenarioRepository.save(ts);

        String tsNodeId = "TS-" + saved.getId();
        String parentNodeId = resolveParentNodeId(req);
        linkRelatedRefs(wr.getId(), req, saved.getId(), "TEST_SCENARIO");

        return new FlowItemCreateResponse(
                tsNodeId, saved.getId(), "TEST_SCENARIO",
                saved.getScenarioNo(), saved.getTitle(), saved.getStatus(),
                "edge-" + parentNodeId + "-" + tsNodeId, parentNodeId, tsNodeId);
    }

    private FlowItemCreateResponse createDeployment(WorkRequest wr, Long teamId, Long registrantId, FlowItemCreateRequest req) {
        Deployment dp = new Deployment();
        dp.setDeployNo(documentNoGenerator.next("DP"));
        dp.setTitle(req.title());
        dp.setOverview("");
        dp.setVersion("v0.1.0");
        dp.setType("정기배포");
        dp.setEnvironment("개발");
        dp.setStatus("대기");
        dp.setScheduledAt(LocalDate.now().plusDays(7));
        dp.setTeamId(teamId);
        dp.setManagerId(registrantId);
        Deployment saved = deploymentRepository.save(dp);

        String dpNodeId = "DP-" + saved.getId();
        String parentNodeId = resolveParentNodeId(req);
        linkRelatedRefs(wr.getId(), req, saved.getId(), "DEPLOYMENT");

        return new FlowItemCreateResponse(
                dpNodeId, saved.getId(), "DEPLOYMENT",
                saved.getDeployNo(), saved.getTitle(), saved.getStatus(),
                "edge-" + parentNodeId + "-" + dpNodeId, parentNodeId, dpNodeId);
    }

    /**
     * 양방향 RelatedRef 연결:
     * - 부모 → 새 항목
     * - 새 항목 → 부모
     * - TechTask가 부모인 경우 WR ↔ 새 항목도 추가
     */
    private void linkRelatedRefs(Long workRequestId, FlowItemCreateRequest req, Long newItemId, String newItemType) {
        if (PARENT_TYPE_WORK_REQUEST.equals(req.parentType())) {
            // WR → new item
            addWorkRequestRef(workRequestId, newItemType, newItemId);
            // new item → WR
            addChildRef(newItemType, newItemId, PARENT_TYPE_WORK_REQUEST, workRequestId);
        } else if (PARENT_TYPE_TECH_TASK.equals(req.parentType())) {
            // TT → new item
            addTechTaskRef(req.parentId(), newItemType, newItemId);
            // new item → TT
            addChildRef(newItemType, newItemId, PARENT_TYPE_TECH_TASK, req.parentId());
            // WR → new item (so it appears in WR flow chain)
            addWorkRequestRef(workRequestId, newItemType, newItemId);
            // new item → WR
            addChildRef(newItemType, newItemId, PARENT_TYPE_WORK_REQUEST, workRequestId);
        }
    }

    private void addWorkRequestRef(Long wrId, String refType, Long refId) {
        WorkRequestRelatedRef ref = new WorkRequestRelatedRef();
        ref.setWorkRequestId(wrId);
        ref.setRefType(refType);
        ref.setRefId(refId);
        ref.setSortOrder(0);
        workRequestRelatedRefRepository.save(ref);
    }

    private void addTechTaskRef(Long ttId, String refType, Long refId) {
        TechTaskRelatedRef ref = new TechTaskRelatedRef();
        ref.setTechTaskId(ttId);
        ref.setRefType(refType);
        ref.setRefId(refId);
        techTaskRelatedRefRepository.save(ref);
    }

    private void addChildRef(String childType, Long childId, String refType, Long refId) {
        switch (childType) {
            case ITEM_TYPE_TECH_TASK -> {
                TechTaskRelatedRef ref = new TechTaskRelatedRef();
                ref.setTechTaskId(childId);
                ref.setRefType(refType);
                ref.setRefId(refId);
                techTaskRelatedRefRepository.save(ref);
            }
            case ITEM_TYPE_TEST_SCENARIO -> {
                TestScenarioRelatedRef ref = new TestScenarioRelatedRef();
                ref.setTestScenarioId(childId);
                ref.setRefType(refType);
                ref.setRefId(refId);
                testScenarioRelatedRefRepository.save(ref);
            }
            case ITEM_TYPE_DEPLOYMENT -> {
                DeploymentRelatedRef ref = new DeploymentRelatedRef();
                ref.setDeploymentId(childId);
                ref.setRefType(refType);
                ref.setRefId(refId);
                ref.setSortOrder(0);
                deploymentRelatedRefRepository.save(ref);
            }
        }
    }

    private WorkRequest getAccessibleWorkRequest(Long workRequestId) {
        WorkRequest workRequest = workRequestRepository.findById(workRequestId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "WorkRequest not found: " + workRequestId));
        TeamScopeUtil.ensureAccessible(workRequest.getTeamId());
        return workRequest;
    }

    private Long requireCurrentUserId() {
        Long userId = TeamRequestContext.getCurrentUserId();
        if (userId == null) {
            userId = resolveUserIdFromAuthorizationHeader();
        }
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인 사용자 정보를 찾을 수 없습니다.");
        }
        return userId;
    }

    private Long resolveUserIdFromAuthorizationHeader() {
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attributes == null) {
            return null;
        }

        HttpServletRequest request = attributes.getRequest();
        String authorization = request.getHeader("Authorization");
        if (authorization == null || authorization.isBlank()) {
            return null;
        }

        String[] split = authorization.trim().split("\\s+", 2);
        if (split.length != 2 || !"Bearer".equalsIgnoreCase(split[0]) || split[1].isBlank()) {
            return null;
        }

        try {
            return jwtTokenProvider.extractUserId(split[1].trim());
        } catch (ResponseStatusException ex) {
            return null;
        }
    }

    private FlowUiStateResponse normalizeFlowUiState(FlowUiStateRequest request) {
        if (request == null) {
            return FlowUiStateResponse.empty();
        }

        Map<String, FlowUiStateResponse.FlowUiPosition> positions = new LinkedHashMap<>();
        if (request.positions() != null) {
            for (Map.Entry<String, FlowUiStateRequest.FlowUiPosition> entry : request.positions().entrySet()) {
                if (positions.size() >= MAX_UI_POSITIONS) {
                    break;
                }
                String nodeId = normalizeNodeId(entry.getKey());
                FlowUiStateRequest.FlowUiPosition position = entry.getValue();
                if (nodeId == null || position == null) {
                    continue;
                }
                if (!Double.isFinite(position.x()) || !Double.isFinite(position.y())) {
                    continue;
                }
                positions.put(nodeId, new FlowUiStateResponse.FlowUiPosition(position.x(), position.y()));
            }
        }

        List<FlowUiStateResponse.FlowUiEdge> edges = new ArrayList<>();
        if (request.edges() != null) {
            for (FlowUiStateRequest.FlowUiEdge edge : request.edges()) {
                if (edges.size() >= MAX_UI_EDGES) {
                    break;
                }
                if (edge == null) {
                    continue;
                }
                String edgeId = normalizeNodeId(edge.id());
                String source = normalizeNodeId(edge.source());
                String target = normalizeNodeId(edge.target());
                if (edgeId == null || source == null || target == null) {
                    continue;
                }
                if (Objects.equals(source, target)) {
                    continue;
                }
                edges.add(new FlowUiStateResponse.FlowUiEdge(edgeId, source, target));
            }
        }

        List<FlowUiStateResponse.FlowUiCustomNode> customNodes = new ArrayList<>();
        if (request.customNodes() != null) {
            for (FlowUiStateRequest.FlowUiCustomNode customNode : request.customNodes()) {
                if (customNodes.size() >= MAX_UI_CUSTOM_NODES) {
                    break;
                }
                if (customNode == null || customNode.entityId() == null || customNode.entityId() <= 0) {
                    continue;
                }
                String nodeId = normalizeNodeId(customNode.id());
                String nodeType = normalizeCustomNodeType(customNode.nodeType());
                String docNo = normalizeRequiredText(customNode.docNo(), 40);
                String title = normalizeRequiredText(customNode.title(), 200);
                String status = normalizeRequiredText(customNode.status(), 40);
                if (nodeId == null || nodeType == null || docNo == null || title == null || status == null) {
                    continue;
                }

                customNodes.add(new FlowUiStateResponse.FlowUiCustomNode(
                        nodeId,
                        customNode.entityId(),
                        nodeType,
                        docNo,
                        title,
                        status,
                        normalizeOptionalText(customNode.priority(), 40),
                        normalizeOptionalText(customNode.assigneeName(), 80),
                        normalizeOptionalText(customNode.version(), 40)
                ));
            }
        }

        return new FlowUiStateResponse(0L, positions, edges, customNodes);
    }

    private FlowUiStateResponse deserializeFlowUiState(String rawJson) {
        if (rawJson == null || rawJson.isBlank()) {
            return FlowUiStateResponse.empty();
        }
        try {
            FlowUiStateRequest request = objectMapper.readValue(rawJson, FlowUiStateRequest.class);
            return normalizeFlowUiState(request);
        } catch (JsonProcessingException ex) {
            return FlowUiStateResponse.empty();
        }
    }

    private String serializeFlowUiState(FlowUiStateResponse state) {
        try {
            return objectMapper.writeValueAsString(state == null ? FlowUiStateResponse.empty() : state);
        } catch (JsonProcessingException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "워크플로우 UI 상태 직렬화에 실패했습니다.");
        }
    }

    private String normalizeNodeId(String rawId) {
        return normalizeRequiredText(rawId, 120);
    }

    private String normalizeRequiredText(String rawText, int maxLength) {
        if (rawText == null) {
            return null;
        }
        String trimmed = rawText.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        if (trimmed.length() > maxLength) {
            return trimmed.substring(0, maxLength);
        }
        return trimmed;
    }

    private String normalizeOptionalText(String rawText, int maxLength) {
        if (rawText == null) {
            return null;
        }
        String trimmed = rawText.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        if (trimmed.length() > maxLength) {
            return trimmed.substring(0, maxLength);
        }
        return trimmed;
    }

    private String normalizeCustomNodeType(String rawNodeType) {
        if (rawNodeType == null) {
            return null;
        }
        String normalized = rawNodeType.trim().toUpperCase(Locale.ROOT);
        if (UI_NODE_TYPE_DEFECT.equals(normalized) || UI_NODE_TYPE_KNOWLEDGE_BASE.equals(normalized)) {
            return normalized;
        }
        return null;
    }

    private String normalizeParentType(String rawParentType) {
        String normalized = rawParentType.trim().toUpperCase(Locale.ROOT);
        if (PARENT_TYPE_WORK_REQUEST.equals(normalized) || PARENT_TYPE_TECH_TASK.equals(normalized)) {
            return normalized;
        }
        return null;
    }

    private String normalizeItemType(String rawItemType) {
        String normalized = rawItemType.trim().toUpperCase(Locale.ROOT);
        if (ITEM_TYPE_TECH_TASK.equals(normalized)
                || ITEM_TYPE_TEST_SCENARIO.equals(normalized)
                || ITEM_TYPE_DEPLOYMENT.equals(normalized)) {
            return normalized;
        }
        return null;
    }

    private void validateParentChildRule(String parentType, String itemType) {
        if (PARENT_TYPE_WORK_REQUEST.equals(parentType)) {
            return;
        }

        if (PARENT_TYPE_TECH_TASK.equals(parentType)
                && (ITEM_TYPE_TEST_SCENARIO.equals(itemType) || ITEM_TYPE_DEPLOYMENT.equals(itemType))) {
            return;
        }

        throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Unsupported parent-child rule: " + parentType + " -> " + itemType
        );
    }

    private long sanitizeVersion(Long version) {
        if (version == null || version < 0) {
            return 0L;
        }
        return version;
    }

    private String resolveParentNodeId(FlowItemCreateRequest req) {
        return switch (req.parentType()) {
            case PARENT_TYPE_WORK_REQUEST -> "WR-" + req.parentId();
            case PARENT_TYPE_TECH_TASK    -> "TT-" + req.parentId();
            default -> "WR-" + req.parentId();
        };
    }
}
