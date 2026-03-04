package org.example.domain.flow.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import org.example.domain.defect.entity.Defect;
import org.example.domain.defect.repository.DefectRepository;
import org.example.domain.deployment.entity.Deployment;
import org.example.domain.deployment.entity.DeploymentRelatedRef;
import org.example.domain.deployment.repository.DeploymentRelatedRefRepository;
import org.example.domain.deployment.repository.DeploymentRepository;
import org.example.domain.flow.dto.FlowChainResponse;
import org.example.domain.flow.dto.FlowEdgeDeleteRequest;
import org.example.domain.flow.dto.FlowItemCreateRequest;
import org.example.domain.flow.dto.FlowItemCreateResponse;
import org.example.domain.flow.dto.FlowUiStateRequest;
import org.example.domain.flow.dto.FlowUiStateResponse;
import org.example.domain.flow.entity.FlowUiState;
import org.example.domain.flow.realtime.FlowUiRealtimeService;
import org.example.domain.flow.repository.FlowUiStateRepository;
import org.example.domain.knowledgeBase.entity.KnowledgeBaseArticle;
import org.example.domain.knowledgeBase.entity.KnowledgeBaseRelatedRef;
import org.example.domain.knowledgeBase.repository.KnowledgeBaseArticleRepository;
import org.example.domain.knowledgeBase.repository.KnowledgeBaseRelatedRefRepository;
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
import org.springframework.dao.DataIntegrityViolationException;
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

    private static final String PARENT_TYPE_WORK_REQUEST  = "WORK_REQUEST";
    private static final String PARENT_TYPE_TECH_TASK      = "TECH_TASK";
    private static final String PARENT_TYPE_TEST_SCENARIO  = "TEST_SCENARIO";
    private static final String PARENT_TYPE_DEPLOYMENT     = "DEPLOYMENT";
    private static final String PARENT_TYPE_DEFECT         = "DEFECT";
    private static final String ITEM_TYPE_TECH_TASK        = "TECH_TASK";
    private static final String ITEM_TYPE_TEST_SCENARIO    = "TEST_SCENARIO";
    private static final String ITEM_TYPE_DEPLOYMENT       = "DEPLOYMENT";
    private static final String ITEM_TYPE_DEFECT           = "DEFECT";
    private static final String ITEM_TYPE_KNOWLEDGE_BASE   = "KNOWLEDGE_BASE";
    private static final String ITEM_TYPE_WORK_REQUEST     = "WORK_REQUEST";
    private static final String UI_NODE_TYPE_DEFECT        = "DEFECT";
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
    private final DefectRepository defectRepository;
    private final KnowledgeBaseArticleRepository knowledgeBaseArticleRepository;
    private final KnowledgeBaseRelatedRefRepository knowledgeBaseRelatedRefRepository;
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
            DefectRepository defectRepository,
            KnowledgeBaseArticleRepository knowledgeBaseArticleRepository,
            KnowledgeBaseRelatedRefRepository knowledgeBaseRelatedRefRepository,
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
        this.defectRepository = defectRepository;
        this.knowledgeBaseArticleRepository = knowledgeBaseArticleRepository;
        this.knowledgeBaseRelatedRefRepository = knowledgeBaseRelatedRefRepository;
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

        List<Long> directDfIds = wrRefs.stream()
                .filter(r -> ITEM_TYPE_DEFECT.equals(r.getRefType())).map(WorkRequestRelatedRef::getRefId).toList();
        List<Long> directKbIds = wrRefs.stream()
                .filter(r -> ITEM_TYPE_KNOWLEDGE_BASE.equals(r.getRefType())).map(WorkRequestRelatedRef::getRefId).toList();

        // 2. Load tech tasks and their children
        Map<Long, TechTask> techTaskMap = new HashMap<>();
        techTaskRepository.findAllById(ttIds).forEach(tt -> techTaskMap.put(tt.getId(), tt));

        Map<Long, List<Long>> ttToTsIds = new HashMap<>();
        Map<Long, List<Long>> ttToDpIds = new HashMap<>();
        Map<Long, List<Long>> ttToDfIds = new HashMap<>();
        Map<Long, List<Long>> ttToKbIds = new HashMap<>();
        for (Long ttId : ttIds) {
            List<TechTaskRelatedRef> refs = techTaskRelatedRefRepository.findByTechTaskIdOrderByIdAsc(ttId);
            ttToTsIds.put(ttId, refs.stream().filter(r -> ITEM_TYPE_TEST_SCENARIO.equals(r.getRefType()))
                    .map(TechTaskRelatedRef::getRefId).toList());
            ttToDpIds.put(ttId, refs.stream().filter(r -> ITEM_TYPE_DEPLOYMENT.equals(r.getRefType()))
                    .map(TechTaskRelatedRef::getRefId).toList());
            ttToDfIds.put(ttId, refs.stream().filter(r -> ITEM_TYPE_DEFECT.equals(r.getRefType()))
                    .map(TechTaskRelatedRef::getRefId).toList());
            ttToKbIds.put(ttId, Optional.ofNullable(knowledgeBaseRelatedRefRepository.findByRefTypeAndRefId(ITEM_TYPE_TECH_TASK, ttId))
                    .orElse(List.of()).stream()
                    .map(KnowledgeBaseRelatedRef::getArticleId).toList());
        }
        Set<Long> tsIdsViaTechTask = new HashSet<>();
        ttToTsIds.values().forEach(tsIdsViaTechTask::addAll);
        Set<Long> dpIdsViaTechTask = new HashSet<>();
        ttToDpIds.values().forEach(dpIdsViaTechTask::addAll);
        Set<Long> dfIdsViaTechTask = new HashSet<>();
        ttToDfIds.values().forEach(dfIdsViaTechTask::addAll);
        Set<Long> kbIdsViaTechTask = new HashSet<>();
        ttToKbIds.values().forEach(kbIdsViaTechTask::addAll);

        // 3. Collect & batch-load all TS and DP entities
        Set<Long> allTsIds = new HashSet<>(directTsIds);
        ttToTsIds.values().forEach(allTsIds::addAll);
        Set<Long> allDpIds = new HashSet<>(directDpIds);
        ttToDpIds.values().forEach(allDpIds::addAll);

        Map<Long, TestScenario> tsMap = new HashMap<>();
        testScenarioRepository.findAllById(allTsIds).forEach(ts -> tsMap.put(ts.getId(), ts));
        Map<Long, Deployment> dpMap = new HashMap<>();
        deploymentRepository.findAllById(allDpIds).forEach(dp -> dpMap.put(dp.getId(), dp));

        // 3b. Load TS-level DEFECT and KB refs
        Map<Long, List<Long>> tsToDfIds = new HashMap<>();
        Map<Long, List<Long>> tsToKbIds = new HashMap<>();
        for (Long tsId : allTsIds) {
            List<TestScenarioRelatedRef> tsRefs = testScenarioRelatedRefRepository.findByTestScenarioIdOrderByIdAsc(tsId);
            tsToDfIds.put(tsId, tsRefs.stream().filter(r -> ITEM_TYPE_DEFECT.equals(r.getRefType()))
                    .map(TestScenarioRelatedRef::getRefId).toList());
            tsToKbIds.put(tsId, Optional.ofNullable(knowledgeBaseRelatedRefRepository.findByRefTypeAndRefId(ITEM_TYPE_TEST_SCENARIO, tsId))
                    .orElse(List.of()).stream()
                    .map(KnowledgeBaseRelatedRef::getArticleId).toList());
        }
        Set<Long> dfIdsViaTestScenario = new HashSet<>();
        tsToDfIds.values().forEach(dfIdsViaTestScenario::addAll);
        Set<Long> kbIdsViaTestScenario = new HashSet<>();
        tsToKbIds.values().forEach(kbIdsViaTestScenario::addAll);

        Map<Long, List<Long>> dpToKbIds = new HashMap<>();
        for (Long dpId : allDpIds) {
            dpToKbIds.put(dpId, Optional.ofNullable(knowledgeBaseRelatedRefRepository.findByRefTypeAndRefId(PARENT_TYPE_DEPLOYMENT, dpId))
                    .orElse(List.of()).stream()
                    .map(KnowledgeBaseRelatedRef::getArticleId).toList());
        }
        Set<Long> kbIdsViaDeployment = new HashSet<>();
        dpToKbIds.values().forEach(kbIdsViaDeployment::addAll);

        Set<Long> defectParentIds = new HashSet<>(directDfIds);
        ttToDfIds.values().forEach(defectParentIds::addAll);
        tsToDfIds.values().forEach(defectParentIds::addAll);
        Map<Long, List<Long>> dfToKbIds = new HashMap<>();
        for (Long dfId : defectParentIds) {
            dfToKbIds.put(dfId, Optional.ofNullable(knowledgeBaseRelatedRefRepository.findByRefTypeAndRefId(PARENT_TYPE_DEFECT, dfId))
                    .orElse(List.of()).stream()
                    .map(KnowledgeBaseRelatedRef::getArticleId).toList());
        }
        Set<Long> kbIdsViaDefect = new HashSet<>();
        dfToKbIds.values().forEach(kbIdsViaDefect::addAll);

        List<Long> filteredDirectTsIds = directTsIds.stream()
                .filter(tsId -> !tsIdsViaTechTask.contains(tsId))
                .toList();
        List<Long> filteredDirectDpIds = directDpIds.stream()
                .filter(dpId -> !dpIdsViaTechTask.contains(dpId))
                .toList();
        List<Long> filteredDirectDfIds = directDfIds.stream()
                .filter(dfId -> !dfIdsViaTechTask.contains(dfId) && !dfIdsViaTestScenario.contains(dfId))
                .toList();
        List<Long> filteredDirectKbIds = directKbIds.stream()
                .filter(kbId -> !kbIdsViaTechTask.contains(kbId)
                        && !kbIdsViaTestScenario.contains(kbId)
                        && !kbIdsViaDeployment.contains(kbId)
                        && !kbIdsViaDefect.contains(kbId))
                .toList();

        // 3c. Collect all DEFECT and KB ids
        Set<Long> allDfIds = new HashSet<>(directDfIds);
        ttToDfIds.values().forEach(allDfIds::addAll);
        tsToDfIds.values().forEach(allDfIds::addAll);
        Set<Long> allKbIds = new HashSet<>(directKbIds);
        ttToKbIds.values().forEach(allKbIds::addAll);
        tsToKbIds.values().forEach(allKbIds::addAll);
        dpToKbIds.values().forEach(allKbIds::addAll);
        dfToKbIds.values().forEach(allKbIds::addAll);

        Map<Long, Defect> dfMap = new HashMap<>();
        defectRepository.findAllById(allDfIds).forEach(df -> dfMap.put(df.getId(), df));
        Map<Long, KnowledgeBaseArticle> kbMap = new HashMap<>();
        knowledgeBaseArticleRepository.findAllById(allKbIds).forEach(kb -> kbMap.put(kb.getId(), kb));

        // 4. Batch-load user names
        Set<Long> userIds = new HashSet<>();
        if (wr.getAssigneeId() != null) userIds.add(wr.getAssigneeId());
        techTaskMap.values().forEach(tt -> { if (tt.getAssigneeId() != null) userIds.add(tt.getAssigneeId()); });
        tsMap.values().forEach(ts -> { if (ts.getAssigneeId() != null) userIds.add(ts.getAssigneeId()); });
        dfMap.values().forEach(df -> { if (df.getAssigneeId() != null) userIds.add(df.getAssigneeId()); });

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
        for (Long tsId : filteredDirectTsIds) {
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
        for (Long dpId : filteredDirectDpIds) {
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

        // DEFECT nodes under each TT
        for (Long ttId : ttIds) {
            String ttNodeId = "TT-" + ttId;
            for (Long dfId : ttToDfIds.getOrDefault(ttId, List.of())) {
                Defect df = dfMap.get(dfId);
                if (df == null) continue;
                String dfNodeId = "DF-" + df.getId();
                if (!addedNodeIds.contains(dfNodeId)) {
                    nodes.add(new FlowChainResponse.FlowNode(
                            dfNodeId, df.getId(), ITEM_TYPE_DEFECT,
                            df.getDefectNo(), df.getTitle(), df.getStatus(),
                            df.getSeverity(), userNames.get(df.getAssigneeId()), null));
                    addedNodeIds.add(dfNodeId);
                }
                edges.add(new FlowChainResponse.FlowEdge("edge-" + ttNodeId + "-" + dfNodeId, ttNodeId, dfNodeId));
            }
        }

        // DEFECT nodes under each TS
        for (Long tsId : allTsIds) {
            String tsNodeId = "TS-" + tsId;
            for (Long dfId : tsToDfIds.getOrDefault(tsId, List.of())) {
                Defect df = dfMap.get(dfId);
                if (df == null) continue;
                String dfNodeId = "DF-" + df.getId();
                if (!addedNodeIds.contains(dfNodeId)) {
                    nodes.add(new FlowChainResponse.FlowNode(
                            dfNodeId, df.getId(), ITEM_TYPE_DEFECT,
                            df.getDefectNo(), df.getTitle(), df.getStatus(),
                            df.getSeverity(), userNames.get(df.getAssigneeId()), null));
                    addedNodeIds.add(dfNodeId);
                }
                edges.add(new FlowChainResponse.FlowEdge("edge-" + tsNodeId + "-" + dfNodeId, tsNodeId, dfNodeId));
            }
        }

        // Direct DEFECT nodes (WR → DEFECT)
        for (Long dfId : filteredDirectDfIds) {
            Defect df = dfMap.get(dfId);
            if (df == null) continue;
            String dfNodeId = "DF-" + df.getId();
            if (!addedNodeIds.contains(dfNodeId)) {
                nodes.add(new FlowChainResponse.FlowNode(
                        dfNodeId, df.getId(), ITEM_TYPE_DEFECT,
                        df.getDefectNo(), df.getTitle(), df.getStatus(),
                        df.getSeverity(), userNames.get(df.getAssigneeId()), null));
                addedNodeIds.add(dfNodeId);
            }
            edges.add(new FlowChainResponse.FlowEdge("edge-" + wrNodeId + "-" + dfNodeId, wrNodeId, dfNodeId));
        }

        // KB nodes under each TT
        for (Long ttId : ttIds) {
            String ttNodeId = "TT-" + ttId;
            for (Long kbId : ttToKbIds.getOrDefault(ttId, List.of())) {
                KnowledgeBaseArticle kb = kbMap.get(kbId);
                if (kb == null) continue;
                String kbNodeId = "KB-" + kb.getId();
                if (!addedNodeIds.contains(kbNodeId)) {
                    nodes.add(new FlowChainResponse.FlowNode(
                            kbNodeId, kb.getId(), ITEM_TYPE_KNOWLEDGE_BASE,
                            kb.getArticleNo(), kb.getTitle(), "완료",
                            null, null, null));
                    addedNodeIds.add(kbNodeId);
                }
                edges.add(new FlowChainResponse.FlowEdge("edge-" + ttNodeId + "-" + kbNodeId, ttNodeId, kbNodeId));
            }
        }

        // KB nodes under each TS
        for (Long tsId : allTsIds) {
            String tsNodeId = "TS-" + tsId;
            for (Long kbId : tsToKbIds.getOrDefault(tsId, List.of())) {
                KnowledgeBaseArticle kb = kbMap.get(kbId);
                if (kb == null) continue;
                String kbNodeId = "KB-" + kb.getId();
                if (!addedNodeIds.contains(kbNodeId)) {
                    nodes.add(new FlowChainResponse.FlowNode(
                            kbNodeId, kb.getId(), ITEM_TYPE_KNOWLEDGE_BASE,
                            kb.getArticleNo(), kb.getTitle(), "완료",
                            null, null, null));
                    addedNodeIds.add(kbNodeId);
                }
                edges.add(new FlowChainResponse.FlowEdge("edge-" + tsNodeId + "-" + kbNodeId, tsNodeId, kbNodeId));
            }
        }

        // KB nodes under each DEPLOYMENT
        for (Long dpId : allDpIds) {
            String dpNodeId = "DP-" + dpId;
            if (!addedNodeIds.contains(dpNodeId)) {
                continue;
            }
            for (Long kbId : dpToKbIds.getOrDefault(dpId, List.of())) {
                KnowledgeBaseArticle kb = kbMap.get(kbId);
                if (kb == null) continue;
                String kbNodeId = "KB-" + kb.getId();
                if (!addedNodeIds.contains(kbNodeId)) {
                    nodes.add(new FlowChainResponse.FlowNode(
                            kbNodeId, kb.getId(), ITEM_TYPE_KNOWLEDGE_BASE,
                            kb.getArticleNo(), kb.getTitle(), "완료",
                            null, null, null));
                    addedNodeIds.add(kbNodeId);
                }
                edges.add(new FlowChainResponse.FlowEdge("edge-" + dpNodeId + "-" + kbNodeId, dpNodeId, kbNodeId));
            }
        }

        // KB nodes under each DEFECT
        for (Long dfId : allDfIds) {
            String dfNodeId = "DF-" + dfId;
            if (!addedNodeIds.contains(dfNodeId)) {
                continue;
            }
            for (Long kbId : dfToKbIds.getOrDefault(dfId, List.of())) {
                KnowledgeBaseArticle kb = kbMap.get(kbId);
                if (kb == null) continue;
                String kbNodeId = "KB-" + kb.getId();
                if (!addedNodeIds.contains(kbNodeId)) {
                    nodes.add(new FlowChainResponse.FlowNode(
                            kbNodeId, kb.getId(), ITEM_TYPE_KNOWLEDGE_BASE,
                            kb.getArticleNo(), kb.getTitle(), "완료",
                            null, null, null));
                    addedNodeIds.add(kbNodeId);
                }
                edges.add(new FlowChainResponse.FlowEdge("edge-" + dfNodeId + "-" + kbNodeId, dfNodeId, kbNodeId));
            }
        }

        // Direct KB nodes (WR → KB)
        for (Long kbId : filteredDirectKbIds) {
            KnowledgeBaseArticle kb = kbMap.get(kbId);
            if (kb == null) continue;
            String kbNodeId = "KB-" + kb.getId();
            if (!addedNodeIds.contains(kbNodeId)) {
                nodes.add(new FlowChainResponse.FlowNode(
                        kbNodeId, kb.getId(), ITEM_TYPE_KNOWLEDGE_BASE,
                        kb.getArticleNo(), kb.getTitle(), "완료",
                        null, null, null));
                addedNodeIds.add(kbNodeId);
            }
            edges.add(new FlowChainResponse.FlowEdge("edge-" + wrNodeId + "-" + kbNodeId, wrNodeId, kbNodeId));
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
        Long expectedVersion = request.expectedVersion();
        Long nextVersion = currentVersion + 1;

        if (existingState.isPresent()) {
            int updated = flowUiStateRepository.updateStateWithVersion(
                    workRequestId,
                    userId,
                    workRequest.getTeamId(),
                    stateJson,
                    expectedVersion,
                    nextVersion
            );
            if (updated == 0) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "워크플로우 UI 상태가 최신이 아닙니다. expectedVersion=" + expectedVersion
                                + ", currentVersion=" + currentVersion
                );
            }
        } else {
            if (expectedVersion != 0L) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "워크플로우 UI 상태가 최신이 아닙니다. expectedVersion=" + expectedVersion + ", currentVersion=0"
                );
            }

            FlowUiState state = new FlowUiState();
            state.setWorkRequestId(workRequestId);
            state.setUserId(userId);
            state.setTeamId(workRequest.getTeamId());
            state.setStateJson(stateJson);
            state.setVersion(1L);
            try {
                flowUiStateRepository.save(state);
            } catch (DataIntegrityViolationException ex) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "워크플로우 UI 상태가 최신이 아닙니다. expectedVersion=" + expectedVersion + ", currentVersion=1"
                );
            }
        }
        flowUiRealtimeService.publishUpdated(workRequestId, userId);
    }

    @Transactional
    public FlowItemCreateResponse createFlowItem(Long workRequestId, FlowItemCreateRequest request) {
        WorkRequest wr = getAccessibleWorkRequest(workRequestId);
        FlowItemCreateRequest normalizedRequest = normalizeCreateRequest(request);
        validateCreateRequest(wr, normalizedRequest);

        Long teamId = wr.getTeamId();
        Long registrantId = resolveRegistrantId(wr);

        try {
            return switch (normalizedRequest.itemType()) {
                case ITEM_TYPE_TECH_TASK      -> createTechTask(wr, teamId, registrantId, normalizedRequest);
                case ITEM_TYPE_TEST_SCENARIO  -> createTestScenario(wr, teamId, registrantId, normalizedRequest);
                case ITEM_TYPE_DEPLOYMENT     -> createDeployment(wr, teamId, registrantId, normalizedRequest);
                case ITEM_TYPE_DEFECT         -> createDefectItem(wr, teamId, registrantId, normalizedRequest);
                case ITEM_TYPE_KNOWLEDGE_BASE -> createKnowledgeBaseItem(wr, teamId, registrantId, normalizedRequest);
                default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported itemType: " + normalizedRequest.itemType());
            };
        } catch (DataIntegrityViolationException ex) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "문서 생성에 실패했습니다. 작성자/연관관계 정보를 확인해 주세요."
            );
        }
    }

    private Long resolveRegistrantId(WorkRequest workRequest) {
        if (workRequest.getRequesterId() != null) {
            return workRequest.getRequesterId();
        }

        Long currentUserId = TeamRequestContext.getCurrentUserId();
        if (currentUserId == null) {
            currentUserId = resolveUserIdFromAuthorizationHeader();
        }
        if (currentUserId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "문서 작성자 정보를 확인할 수 없습니다.");
        }
        return currentUserId;
    }

    @Transactional
    public void deleteFlowEdge(Long workRequestId, FlowEdgeDeleteRequest request) {
        WorkRequest workRequest = getAccessibleWorkRequest(workRequestId);
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Request body is required");
        }

        NodeRef source = parseNodeRef(request.sourceNodeId());
        NodeRef target = parseNodeRef(request.targetNodeId());
        if (source == null || target == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "sourceNodeId/targetNodeId 형식이 올바르지 않습니다.");
        }
        if (source.id().equals(target.id()) && source.type().equals(target.type())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "동일 노드 간 연결은 삭제할 수 없습니다.");
        }

        validateParentChildRule(source.type(), target.type());
        validateParentBelongsToWorkRequest(workRequest, source.type(), source.id());
        ensureEntityAccessible(workRequest, target.type(), target.id());

        boolean removed = removeParentChildRelation(workRequest.getId(), source.type(), source.id(), target.type(), target.id());
        if (!removed) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "해당 연결을 찾을 수 없습니다.");
        }

        removeReverseReference(workRequest.getId(), source.type(), source.id(), target.type(), target.id());
        pruneEdgeFromFlowUiStates(workRequestId, source.nodeId(), target.nodeId());
    }

    @Transactional
    public void deleteFlowItem(Long workRequestId, String nodeId) {
        WorkRequest workRequest = getAccessibleWorkRequest(workRequestId);
        NodeRef nodeRef = parseNodeRef(nodeId);
        if (nodeRef == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "nodeId 형식이 올바르지 않습니다.");
        }
        if (ITEM_TYPE_WORK_REQUEST.equals(nodeRef.type())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "기준 업무요청 카드는 삭제할 수 없습니다.");
        }

        if (!isNodeConnectedToWorkRequest(workRequest.getId(), nodeRef.type(), nodeRef.id())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "해당 문서는 현재 워크플로우와 연결되어 있지 않습니다.");
        }

        deleteNodeDocument(workRequest, nodeRef.type(), nodeRef.id());
        deleteNodeReferences(nodeRef.type(), nodeRef.id());
        pruneNodeFromFlowUiStates(workRequestId, nodeRef.nodeId());
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
        validateParentBelongsToWorkRequest(workRequest, request.parentType(), request.parentId());
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

    private FlowItemCreateResponse createDefectItem(WorkRequest wr, Long teamId, Long registrantId, FlowItemCreateRequest req) {
        Defect df = new Defect();
        df.setDefectNo(documentNoGenerator.next("DF"));
        df.setTitle(req.title());
        df.setDescription("");
        df.setType("기능");
        df.setSeverity("보통");
        df.setStatus("접수");
        df.setTeamId(teamId);
        df.setReporterId(registrantId);
        df.setExpectedBehavior("기대 동작을 입력하세요.");
        df.setActualBehavior("실제 동작을 입력하세요.");
        df.setReproductionSteps("[]");
        df.setDeadline(LocalDate.now().plusDays(7));
        df.setRelatedRefType(req.parentType());
        df.setRelatedRefId(req.parentId());
        Defect saved = defectRepository.save(df);

        String dfNodeId = "DF-" + saved.getId();
        String parentNodeId = resolveParentNodeId(req);
        linkRelatedRefsForDefect(wr.getId(), req, saved.getId());

        return new FlowItemCreateResponse(
                dfNodeId, saved.getId(), ITEM_TYPE_DEFECT,
                saved.getDefectNo(), saved.getTitle(), saved.getStatus(),
                "edge-" + parentNodeId + "-" + dfNodeId, parentNodeId, dfNodeId);
    }

    private FlowItemCreateResponse createKnowledgeBaseItem(WorkRequest wr, Long teamId, Long registrantId, FlowItemCreateRequest req) {
        KnowledgeBaseArticle kb = new KnowledgeBaseArticle();
        kb.setArticleNo(documentNoGenerator.next("KB"));
        kb.setTeamId(teamId);
        kb.setTitle(req.title());
        kb.setCategory("기타");
        kb.setTags("[]");
        kb.setSummary(req.title());
        kb.setContent("# " + req.title() + "\n\n초안 문서입니다.");
        kb.setAuthorId(registrantId);
        kb.setViewCount(0);
        KnowledgeBaseArticle saved = knowledgeBaseArticleRepository.save(kb);

        String kbNodeId = "KB-" + saved.getId();
        String parentNodeId = resolveParentNodeId(req);
        linkRelatedRefsForKnowledgeBase(wr.getId(), req, saved.getId());

        return new FlowItemCreateResponse(
                kbNodeId, saved.getId(), ITEM_TYPE_KNOWLEDGE_BASE,
                saved.getArticleNo(), saved.getTitle(), "완료",
                "edge-" + parentNodeId + "-" + kbNodeId, parentNodeId, kbNodeId);
    }

    /**
     * 양방향 RelatedRef 연결:
     * - 부모 → 새 항목
     * - 새 항목 → 부모 (지원 도메인에 한함)
     */
    private void linkRelatedRefs(Long workRequestId, FlowItemCreateRequest req, Long newItemId, String newItemType) {
        if (PARENT_TYPE_WORK_REQUEST.equals(req.parentType())) {
            addWorkRequestRef(workRequestId, newItemType, newItemId);
            addChildRef(newItemType, newItemId, PARENT_TYPE_WORK_REQUEST, workRequestId);
        } else if (PARENT_TYPE_TECH_TASK.equals(req.parentType())) {
            addTechTaskRef(req.parentId(), newItemType, newItemId);
            addChildRef(newItemType, newItemId, PARENT_TYPE_TECH_TASK, req.parentId());
        } else if (PARENT_TYPE_TEST_SCENARIO.equals(req.parentType())) {
            addTestScenarioRef(req.parentId(), newItemType, newItemId);
            addChildRef(newItemType, newItemId, PARENT_TYPE_TEST_SCENARIO, req.parentId());
        }
    }

    // DEFECT: relatedRefType/relatedRefId already set on entity; only add parent→DF refs
    private void linkRelatedRefsForDefect(Long workRequestId, FlowItemCreateRequest req, Long defectId) {
        if (PARENT_TYPE_WORK_REQUEST.equals(req.parentType())) {
            addWorkRequestRef(workRequestId, ITEM_TYPE_DEFECT, defectId);
        } else if (PARENT_TYPE_TECH_TASK.equals(req.parentType())) {
            addTechTaskRef(req.parentId(), ITEM_TYPE_DEFECT, defectId);
        } else if (PARENT_TYPE_TEST_SCENARIO.equals(req.parentType())) {
            addTestScenarioRef(req.parentId(), ITEM_TYPE_DEFECT, defectId);
        }
    }

    // KB: add parent→KB refs and KB→parent back-ref
    private void linkRelatedRefsForKnowledgeBase(Long workRequestId, FlowItemCreateRequest req, Long kbId) {
        if (PARENT_TYPE_WORK_REQUEST.equals(req.parentType())) {
            addWorkRequestRef(workRequestId, ITEM_TYPE_KNOWLEDGE_BASE, kbId);
        } else if (PARENT_TYPE_DEPLOYMENT.equals(req.parentType())) {
            addDeploymentRef(req.parentId(), ITEM_TYPE_KNOWLEDGE_BASE, kbId);
        }
        // KB → parent back-ref (for KB detail page's related docs)
        KnowledgeBaseRelatedRef backRef = new KnowledgeBaseRelatedRef();
        backRef.setArticleId(kbId);
        backRef.setRefType(req.parentType());
        backRef.setRefId(req.parentId());
        backRef.setSortOrder(0);
        knowledgeBaseRelatedRefRepository.save(backRef);
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

    private void addTestScenarioRef(Long tsId, String refType, Long refId) {
        TestScenarioRelatedRef ref = new TestScenarioRelatedRef();
        ref.setTestScenarioId(tsId);
        ref.setRefType(refType);
        ref.setRefId(refId);
        testScenarioRelatedRefRepository.save(ref);
    }

    private void addDeploymentRef(Long deploymentId, String refType, Long refId) {
        DeploymentRelatedRef ref = new DeploymentRelatedRef();
        ref.setDeploymentId(deploymentId);
        ref.setRefType(refType);
        ref.setRefId(refId);
        ref.setSortOrder(0);
        deploymentRelatedRefRepository.save(ref);
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
            case ITEM_TYPE_KNOWLEDGE_BASE -> {
                KnowledgeBaseRelatedRef ref = new KnowledgeBaseRelatedRef();
                ref.setArticleId(childId);
                ref.setRefType(refType);
                ref.setRefId(refId);
                ref.setSortOrder(0);
                knowledgeBaseRelatedRefRepository.save(ref);
            }
            // DEFECT: relatedRefType/relatedRefId is set directly on the entity; no separate table
        }
    }

    private void validateParentBelongsToWorkRequest(WorkRequest workRequest, String parentType, Long parentId) {
        switch (parentType) {
            case PARENT_TYPE_WORK_REQUEST -> {
                if (!workRequest.getId().equals(parentId)) {
                    throw new ResponseStatusException(
                            HttpStatus.BAD_REQUEST,
                            "For WORK_REQUEST parentType, parentId must match path workRequestId"
                    );
                }
            }
            case PARENT_TYPE_TECH_TASK -> {
                TechTask parentTechTask = techTaskRepository.findById(parentId)
                        .orElseThrow(() -> new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "TechTask parent not found: " + parentId
                        ));
                TeamScopeUtil.ensureAccessible(parentTechTask.getTeamId());

                if (!Objects.equals(parentTechTask.getTeamId(), workRequest.getTeamId())) {
                    throw new ResponseStatusException(
                            HttpStatus.BAD_REQUEST,
                            "Parent tech task is not in the same team as target work request"
                    );
                }

                boolean linkedToWorkRequest = isTechTaskConnectedToWorkRequest(workRequest.getId(), parentTechTask.getId());
                if (!linkedToWorkRequest) {
                    throw new ResponseStatusException(
                            HttpStatus.BAD_REQUEST,
                            "Parent tech task is not connected to target work request"
                    );
                }
            }
            case PARENT_TYPE_TEST_SCENARIO -> {
                TestScenario parentTs = testScenarioRepository.findById(parentId)
                        .orElseThrow(() -> new ResponseStatusException(
                                HttpStatus.NOT_FOUND, "TestScenario parent not found: " + parentId));
                TeamScopeUtil.ensureAccessible(parentTs.getTeamId());
                if (!Objects.equals(parentTs.getTeamId(), workRequest.getTeamId())) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "Parent test scenario is not in the same team as target work request");
                }
                if (!isTestScenarioConnectedToWorkRequest(workRequest.getId(), parentTs.getId())) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "Parent test scenario is not connected to target work request");
                }
            }
            case PARENT_TYPE_DEPLOYMENT -> {
                Deployment parentDeployment = deploymentRepository.findById(parentId)
                        .orElseThrow(() -> new ResponseStatusException(
                                HttpStatus.NOT_FOUND, "Deployment parent not found: " + parentId));
                TeamScopeUtil.ensureAccessible(parentDeployment.getTeamId());
                if (!Objects.equals(parentDeployment.getTeamId(), workRequest.getTeamId())) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "Parent deployment is not in the same team as target work request");
                }
                if (!isDeploymentConnectedToWorkRequest(workRequest.getId(), parentDeployment.getId())) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "Parent deployment is not connected to target work request");
                }
            }
            case PARENT_TYPE_DEFECT -> {
                Defect parentDefect = defectRepository.findById(parentId)
                        .orElseThrow(() -> new ResponseStatusException(
                                HttpStatus.NOT_FOUND, "Defect parent not found: " + parentId));
                TeamScopeUtil.ensureAccessible(parentDefect.getTeamId());
                if (!Objects.equals(parentDefect.getTeamId(), workRequest.getTeamId())) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "Parent defect is not in the same team as target work request");
                }
                if (!isDefectConnectedToWorkRequest(workRequest.getId(), parentDefect.getId())) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "Parent defect is not connected to target work request");
                }
            }
            default -> throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Unsupported parentType: " + parentType
            );
        }
    }

    private void ensureEntityAccessible(WorkRequest workRequest, String entityType, Long entityId) {
        switch (entityType) {
            case ITEM_TYPE_WORK_REQUEST -> {
                if (!workRequest.getId().equals(entityId)) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "WORK_REQUEST 노드가 기준 업무요청과 다릅니다.");
                }
            }
            case ITEM_TYPE_TECH_TASK -> {
                TechTask entity = techTaskRepository.findById(entityId)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "TechTask not found: " + entityId));
                TeamScopeUtil.ensureAccessible(entity.getTeamId());
                if (!Objects.equals(entity.getTeamId(), workRequest.getTeamId())) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "기술과제가 기준 업무요청과 다른 팀입니다.");
                }
            }
            case ITEM_TYPE_TEST_SCENARIO -> {
                TestScenario entity = testScenarioRepository.findById(entityId)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "TestScenario not found: " + entityId));
                TeamScopeUtil.ensureAccessible(entity.getTeamId());
                if (!Objects.equals(entity.getTeamId(), workRequest.getTeamId())) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "테스트 시나리오가 기준 업무요청과 다른 팀입니다.");
                }
            }
            case ITEM_TYPE_DEPLOYMENT -> {
                Deployment entity = deploymentRepository.findById(entityId)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Deployment not found: " + entityId));
                TeamScopeUtil.ensureAccessible(entity.getTeamId());
                if (!Objects.equals(entity.getTeamId(), workRequest.getTeamId())) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "배포 문서가 기준 업무요청과 다른 팀입니다.");
                }
            }
            case ITEM_TYPE_DEFECT -> {
                Defect entity = defectRepository.findById(entityId)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Defect not found: " + entityId));
                TeamScopeUtil.ensureAccessible(entity.getTeamId());
                if (!Objects.equals(entity.getTeamId(), workRequest.getTeamId())) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "결함 문서가 기준 업무요청과 다른 팀입니다.");
                }
            }
            case ITEM_TYPE_KNOWLEDGE_BASE -> {
                KnowledgeBaseArticle entity = knowledgeBaseArticleRepository.findById(entityId)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "KnowledgeBase not found: " + entityId));
                TeamScopeUtil.ensureAccessible(entity.getTeamId());
                if (!Objects.equals(entity.getTeamId(), workRequest.getTeamId())) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "지식베이스 문서가 기준 업무요청과 다른 팀입니다.");
                }
            }
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported node type: " + entityType);
        }
    }

    private boolean isTechTaskConnectedToWorkRequest(Long workRequestId, Long techTaskId) {
        return workRequestRelatedRefRepository.existsByWorkRequestIdAndRefTypeAndRefId(workRequestId, ITEM_TYPE_TECH_TASK, techTaskId)
                || techTaskRelatedRefRepository.existsByTechTaskIdAndRefTypeAndRefId(techTaskId, ITEM_TYPE_WORK_REQUEST, workRequestId);
    }

    private boolean isTestScenarioConnectedToWorkRequest(Long workRequestId, Long testScenarioId) {
        boolean linkedDirectlyToWr = workRequestRelatedRefRepository
                .existsByWorkRequestIdAndRefTypeAndRefId(workRequestId, ITEM_TYPE_TEST_SCENARIO, testScenarioId);
        if (linkedDirectlyToWr) {
            return true;
        }

        List<Long> parentTechTaskIds = testScenarioRelatedRefRepository
                .findByTestScenarioIdOrderByIdAsc(testScenarioId).stream()
                .filter(ref -> ITEM_TYPE_TECH_TASK.equals(ref.getRefType()))
                .map(TestScenarioRelatedRef::getRefId)
                .toList();

        return parentTechTaskIds.stream().anyMatch(techTaskId -> isTechTaskConnectedToWorkRequest(workRequestId, techTaskId));
    }

    private boolean isDeploymentConnectedToWorkRequest(Long workRequestId, Long deploymentId) {
        boolean linkedDirectlyToWr = workRequestRelatedRefRepository
                .existsByWorkRequestIdAndRefTypeAndRefId(workRequestId, ITEM_TYPE_DEPLOYMENT, deploymentId);
        if (linkedDirectlyToWr) {
            return true;
        }

        return techTaskRelatedRefRepository.findByRefTypeAndRefId(ITEM_TYPE_DEPLOYMENT, deploymentId).stream()
                .map(TechTaskRelatedRef::getTechTaskId)
                .anyMatch(techTaskId -> isTechTaskConnectedToWorkRequest(workRequestId, techTaskId));
    }

    private boolean isDefectConnectedToWorkRequest(Long workRequestId, Long defectId) {
        boolean linkedDirectlyToWr = workRequestRelatedRefRepository
                .existsByWorkRequestIdAndRefTypeAndRefId(workRequestId, ITEM_TYPE_DEFECT, defectId);
        if (linkedDirectlyToWr) {
            return true;
        }

        boolean linkedViaTechTask = techTaskRelatedRefRepository.findByRefTypeAndRefId(ITEM_TYPE_DEFECT, defectId).stream()
                .map(TechTaskRelatedRef::getTechTaskId)
                .anyMatch(techTaskId -> isTechTaskConnectedToWorkRequest(workRequestId, techTaskId));
        if (linkedViaTechTask) {
            return true;
        }

        boolean linkedViaTestScenario = testScenarioRelatedRefRepository.findByRefTypeAndRefId(ITEM_TYPE_DEFECT, defectId).stream()
                .map(TestScenarioRelatedRef::getTestScenarioId)
                .anyMatch(testScenarioId -> isTestScenarioConnectedToWorkRequest(workRequestId, testScenarioId));
        if (linkedViaTestScenario) {
            return true;
        }

        return defectRepository.findById(defectId)
                .map(defect -> {
                    if (defect.getRelatedRefType() == null || defect.getRelatedRefId() == null) {
                        return false;
                    }
                    return switch (defect.getRelatedRefType()) {
                        case ITEM_TYPE_WORK_REQUEST -> Objects.equals(defect.getRelatedRefId(), workRequestId);
                        case ITEM_TYPE_TECH_TASK -> isTechTaskConnectedToWorkRequest(workRequestId, defect.getRelatedRefId());
                        case ITEM_TYPE_TEST_SCENARIO -> isTestScenarioConnectedToWorkRequest(workRequestId, defect.getRelatedRefId());
                        default -> false;
                    };
                })
                .orElse(false);
    }

    private boolean isKnowledgeBaseConnectedToWorkRequest(Long workRequestId, Long articleId) {
        boolean linkedDirectlyToWr = workRequestRelatedRefRepository
                .existsByWorkRequestIdAndRefTypeAndRefId(workRequestId, ITEM_TYPE_KNOWLEDGE_BASE, articleId)
                || knowledgeBaseRelatedRefRepository.existsByArticleIdAndRefTypeAndRefId(articleId, ITEM_TYPE_WORK_REQUEST, workRequestId);
        if (linkedDirectlyToWr) {
            return true;
        }

        boolean linkedViaTechTask = techTaskRelatedRefRepository.findByRefTypeAndRefId(ITEM_TYPE_KNOWLEDGE_BASE, articleId).stream()
                .map(TechTaskRelatedRef::getTechTaskId)
                .anyMatch(techTaskId -> isTechTaskConnectedToWorkRequest(workRequestId, techTaskId));
        if (!linkedViaTechTask) {
            linkedViaTechTask = knowledgeBaseRelatedRefRepository.findByArticleIdOrderBySortOrderAscIdAsc(articleId).stream()
                    .filter(ref -> ITEM_TYPE_TECH_TASK.equals(ref.getRefType()))
                    .map(KnowledgeBaseRelatedRef::getRefId)
                    .anyMatch(techTaskId -> isTechTaskConnectedToWorkRequest(workRequestId, techTaskId));
        }
        if (linkedViaTechTask) {
            return true;
        }

        boolean linkedViaTestScenario = testScenarioRelatedRefRepository.findByRefTypeAndRefId(ITEM_TYPE_KNOWLEDGE_BASE, articleId).stream()
                .map(TestScenarioRelatedRef::getTestScenarioId)
                .anyMatch(testScenarioId -> isTestScenarioConnectedToWorkRequest(workRequestId, testScenarioId));
        if (!linkedViaTestScenario) {
            linkedViaTestScenario = knowledgeBaseRelatedRefRepository.findByArticleIdOrderBySortOrderAscIdAsc(articleId).stream()
                    .filter(ref -> ITEM_TYPE_TEST_SCENARIO.equals(ref.getRefType()))
                    .map(KnowledgeBaseRelatedRef::getRefId)
                    .anyMatch(testScenarioId -> isTestScenarioConnectedToWorkRequest(workRequestId, testScenarioId));
        }
        if (linkedViaTestScenario) {
            return true;
        }

        boolean linkedViaDeployment = deploymentRelatedRefRepository.findByRefTypeAndRefId(ITEM_TYPE_KNOWLEDGE_BASE, articleId).stream()
                .map(DeploymentRelatedRef::getDeploymentId)
                .anyMatch(deploymentId -> isDeploymentConnectedToWorkRequest(workRequestId, deploymentId));
        if (!linkedViaDeployment) {
            linkedViaDeployment = knowledgeBaseRelatedRefRepository.findByArticleIdOrderBySortOrderAscIdAsc(articleId).stream()
                    .filter(ref -> PARENT_TYPE_DEPLOYMENT.equals(ref.getRefType()))
                    .map(KnowledgeBaseRelatedRef::getRefId)
                    .anyMatch(deploymentId -> isDeploymentConnectedToWorkRequest(workRequestId, deploymentId));
        }
        if (linkedViaDeployment) {
            return true;
        }

        return knowledgeBaseRelatedRefRepository.findByArticleIdOrderBySortOrderAscIdAsc(articleId).stream()
                .filter(ref -> PARENT_TYPE_DEFECT.equals(ref.getRefType()))
                .map(KnowledgeBaseRelatedRef::getRefId)
                .anyMatch(defectId -> isDefectConnectedToWorkRequest(workRequestId, defectId));
    }

    private boolean isNodeConnectedToWorkRequest(Long workRequestId, String nodeType, Long entityId) {
        return switch (nodeType) {
            case ITEM_TYPE_TECH_TASK -> isTechTaskConnectedToWorkRequest(workRequestId, entityId);
            case ITEM_TYPE_TEST_SCENARIO -> isTestScenarioConnectedToWorkRequest(workRequestId, entityId);
            case ITEM_TYPE_DEPLOYMENT -> isDeploymentConnectedToWorkRequest(workRequestId, entityId);
            case ITEM_TYPE_DEFECT -> isDefectConnectedToWorkRequest(workRequestId, entityId);
            case ITEM_TYPE_KNOWLEDGE_BASE -> isKnowledgeBaseConnectedToWorkRequest(workRequestId, entityId);
            case ITEM_TYPE_WORK_REQUEST -> Objects.equals(workRequestId, entityId);
            default -> false;
        };
    }

    private boolean removeParentChildRelation(
            Long workRequestId,
            String parentType,
            Long parentId,
            String childType,
            Long childId
    ) {
        return switch (parentType) {
            case PARENT_TYPE_WORK_REQUEST -> {
                boolean exists = workRequestRelatedRefRepository
                        .existsByWorkRequestIdAndRefTypeAndRefId(workRequestId, childType, childId);
                if (exists) {
                    workRequestRelatedRefRepository.deleteByWorkRequestIdAndRefTypeAndRefId(workRequestId, childType, childId);
                }
                yield exists;
            }
            case PARENT_TYPE_TECH_TASK -> {
                if (ITEM_TYPE_KNOWLEDGE_BASE.equals(childType)) {
                    boolean exists = knowledgeBaseRelatedRefRepository
                            .existsByArticleIdAndRefTypeAndRefId(childId, PARENT_TYPE_TECH_TASK, parentId);
                    if (exists) {
                        knowledgeBaseRelatedRefRepository
                                .deleteByArticleIdAndRefTypeAndRefId(childId, PARENT_TYPE_TECH_TASK, parentId);
                    }
                    yield exists;
                }
                boolean exists = techTaskRelatedRefRepository
                        .existsByTechTaskIdAndRefTypeAndRefId(parentId, childType, childId);
                if (exists) {
                    techTaskRelatedRefRepository.deleteByTechTaskIdAndRefTypeAndRefId(parentId, childType, childId);
                }
                yield exists;
            }
            case PARENT_TYPE_TEST_SCENARIO -> {
                if (ITEM_TYPE_KNOWLEDGE_BASE.equals(childType)) {
                    boolean exists = knowledgeBaseRelatedRefRepository
                            .existsByArticleIdAndRefTypeAndRefId(childId, PARENT_TYPE_TEST_SCENARIO, parentId);
                    if (exists) {
                        knowledgeBaseRelatedRefRepository
                                .deleteByArticleIdAndRefTypeAndRefId(childId, PARENT_TYPE_TEST_SCENARIO, parentId);
                    }
                    yield exists;
                }
                boolean exists = testScenarioRelatedRefRepository
                        .existsByTestScenarioIdAndRefTypeAndRefId(parentId, childType, childId);
                if (exists) {
                    testScenarioRelatedRefRepository.deleteByTestScenarioIdAndRefTypeAndRefId(parentId, childType, childId);
                }
                yield exists;
            }
            case PARENT_TYPE_DEPLOYMENT -> {
                if (!ITEM_TYPE_KNOWLEDGE_BASE.equals(childType)) {
                    yield false;
                }
                boolean existsViaDeploymentRef = deploymentRelatedRefRepository
                        .existsByDeploymentIdAndRefTypeAndRefId(parentId, ITEM_TYPE_KNOWLEDGE_BASE, childId);
                if (existsViaDeploymentRef) {
                    deploymentRelatedRefRepository.deleteByDeploymentIdAndRefTypeAndRefId(parentId, ITEM_TYPE_KNOWLEDGE_BASE, childId);
                }
                boolean existsViaKbBackRef = knowledgeBaseRelatedRefRepository
                        .existsByArticleIdAndRefTypeAndRefId(childId, PARENT_TYPE_DEPLOYMENT, parentId);
                if (existsViaKbBackRef) {
                    knowledgeBaseRelatedRefRepository
                            .deleteByArticleIdAndRefTypeAndRefId(childId, PARENT_TYPE_DEPLOYMENT, parentId);
                }
                yield existsViaDeploymentRef || existsViaKbBackRef;
            }
            case PARENT_TYPE_DEFECT -> {
                if (!ITEM_TYPE_KNOWLEDGE_BASE.equals(childType)) {
                    yield false;
                }
                boolean exists = knowledgeBaseRelatedRefRepository
                        .existsByArticleIdAndRefTypeAndRefId(childId, PARENT_TYPE_DEFECT, parentId);
                if (exists) {
                    knowledgeBaseRelatedRefRepository
                            .deleteByArticleIdAndRefTypeAndRefId(childId, PARENT_TYPE_DEFECT, parentId);
                }
                yield exists;
            }
            default -> false;
        };
    }

    private void removeReverseReference(
            Long workRequestId,
            String parentType,
            Long parentId,
            String childType,
            Long childId
    ) {
        switch (childType) {
            case ITEM_TYPE_TECH_TASK -> {
                if (PARENT_TYPE_WORK_REQUEST.equals(parentType)) {
                    techTaskRelatedRefRepository.deleteByTechTaskIdAndRefTypeAndRefId(childId, ITEM_TYPE_WORK_REQUEST, workRequestId);
                }
            }
            case ITEM_TYPE_TEST_SCENARIO -> {
                if (PARENT_TYPE_WORK_REQUEST.equals(parentType)) {
                    testScenarioRelatedRefRepository.deleteByTestScenarioIdAndRefTypeAndRefId(childId, ITEM_TYPE_WORK_REQUEST, workRequestId);
                } else if (PARENT_TYPE_TECH_TASK.equals(parentType)) {
                    testScenarioRelatedRefRepository.deleteByTestScenarioIdAndRefTypeAndRefId(childId, ITEM_TYPE_TECH_TASK, parentId);
                }
            }
            case ITEM_TYPE_DEPLOYMENT -> {
                if (PARENT_TYPE_WORK_REQUEST.equals(parentType)) {
                    deploymentRelatedRefRepository.deleteByDeploymentIdAndRefTypeAndRefId(childId, ITEM_TYPE_WORK_REQUEST, workRequestId);
                } else if (PARENT_TYPE_TECH_TASK.equals(parentType)) {
                    deploymentRelatedRefRepository.deleteByDeploymentIdAndRefTypeAndRefId(childId, ITEM_TYPE_TECH_TASK, parentId);
                }
            }
            case ITEM_TYPE_DEFECT -> defectRepository.findById(childId).ifPresent(defect -> {
                if (Objects.equals(defect.getRelatedRefType(), parentType)
                        && Objects.equals(defect.getRelatedRefId(), parentId)) {
                    defect.setRelatedRefType(null);
                    defect.setRelatedRefId(null);
                }
            });
            case ITEM_TYPE_KNOWLEDGE_BASE -> {
                // DEPLOYMENT/DEFECT -> KB 관계는 부모 쪽 제거 로직에서 이미 처리한다.
                if (PARENT_TYPE_DEPLOYMENT.equals(parentType) || PARENT_TYPE_DEFECT.equals(parentType)) {
                    return;
                }
                knowledgeBaseRelatedRefRepository.deleteByArticleIdAndRefTypeAndRefId(childId, parentType, parentId);
            }
            default -> {
            }
        }
    }

    private void deleteNodeDocument(WorkRequest workRequest, String nodeType, Long entityId) {
        switch (nodeType) {
            case ITEM_TYPE_TECH_TASK -> {
                TechTask entity = techTaskRepository.findById(entityId)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "TechTask not found: " + entityId));
                TeamScopeUtil.ensureAccessible(entity.getTeamId());
                if (!Objects.equals(entity.getTeamId(), workRequest.getTeamId())) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "기술과제가 기준 업무요청과 다른 팀입니다.");
                }
                techTaskRepository.delete(entity);
            }
            case ITEM_TYPE_TEST_SCENARIO -> {
                TestScenario entity = testScenarioRepository.findById(entityId)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "TestScenario not found: " + entityId));
                TeamScopeUtil.ensureAccessible(entity.getTeamId());
                if (!Objects.equals(entity.getTeamId(), workRequest.getTeamId())) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "테스트 시나리오가 기준 업무요청과 다른 팀입니다.");
                }
                testScenarioRepository.delete(entity);
            }
            case ITEM_TYPE_DEPLOYMENT -> {
                Deployment entity = deploymentRepository.findById(entityId)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Deployment not found: " + entityId));
                TeamScopeUtil.ensureAccessible(entity.getTeamId());
                if (!Objects.equals(entity.getTeamId(), workRequest.getTeamId())) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "배포 문서가 기준 업무요청과 다른 팀입니다.");
                }
                deploymentRepository.delete(entity);
            }
            case ITEM_TYPE_DEFECT -> {
                Defect entity = defectRepository.findById(entityId)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Defect not found: " + entityId));
                TeamScopeUtil.ensureAccessible(entity.getTeamId());
                if (!Objects.equals(entity.getTeamId(), workRequest.getTeamId())) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "결함 문서가 기준 업무요청과 다른 팀입니다.");
                }
                defectRepository.delete(entity);
            }
            case ITEM_TYPE_KNOWLEDGE_BASE -> {
                KnowledgeBaseArticle entity = knowledgeBaseArticleRepository.findById(entityId)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "KnowledgeBase not found: " + entityId));
                TeamScopeUtil.ensureAccessible(entity.getTeamId());
                if (!Objects.equals(entity.getTeamId(), workRequest.getTeamId())) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "지식베이스 문서가 기준 업무요청과 다른 팀입니다.");
                }
                knowledgeBaseArticleRepository.delete(entity);
            }
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported node type: " + nodeType);
        }
    }

    private void deleteNodeReferences(String nodeType, Long entityId) {
        workRequestRelatedRefRepository.deleteByRefTypeAndRefId(nodeType, entityId);
        techTaskRelatedRefRepository.deleteByRefTypeAndRefId(nodeType, entityId);
        testScenarioRelatedRefRepository.deleteByRefTypeAndRefId(nodeType, entityId);
        deploymentRelatedRefRepository.deleteByRefTypeAndRefId(nodeType, entityId);
        knowledgeBaseRelatedRefRepository.deleteByRefTypeAndRefId(nodeType, entityId);
        clearDefectParentReference(nodeType, entityId);

        switch (nodeType) {
            case ITEM_TYPE_TECH_TASK -> techTaskRelatedRefRepository.deleteByTechTaskId(entityId);
            case ITEM_TYPE_TEST_SCENARIO -> testScenarioRelatedRefRepository.deleteByTestScenarioId(entityId);
            case ITEM_TYPE_DEPLOYMENT -> deploymentRelatedRefRepository.deleteByDeploymentId(entityId);
            case ITEM_TYPE_KNOWLEDGE_BASE -> knowledgeBaseRelatedRefRepository.deleteByArticleId(entityId);
            default -> {
            }
        }
    }

    private void clearDefectParentReference(String parentType, Long parentId) {
        defectRepository.findByRelatedRefTypeAndRelatedRefId(parentType, parentId).forEach(defect -> {
            defect.setRelatedRefType(null);
            defect.setRelatedRefId(null);
        });
    }

    private void pruneEdgeFromFlowUiStates(Long workRequestId, String sourceNodeId, String targetNodeId) {
        List<FlowUiState> states = Optional.ofNullable(flowUiStateRepository.findByWorkRequestId(workRequestId)).orElse(List.of());
        for (FlowUiState state : states) {
            FlowUiStateResponse parsed = deserializeFlowUiState(state.getStateJson());
            List<FlowUiStateResponse.FlowUiEdge> prunedEdges = parsed.edges().stream()
                    .filter(edge -> !(Objects.equals(edge.source(), sourceNodeId) && Objects.equals(edge.target(), targetNodeId)))
                    .toList();
            if (prunedEdges.size() == parsed.edges().size()) {
                continue;
            }
            savePrunedFlowUiState(state, parsed.positions(), prunedEdges, parsed.customNodes());
        }
    }

    private void pruneNodeFromFlowUiStates(Long workRequestId, String nodeId) {
        List<FlowUiState> states = Optional.ofNullable(flowUiStateRepository.findByWorkRequestId(workRequestId)).orElse(List.of());
        for (FlowUiState state : states) {
            FlowUiStateResponse parsed = deserializeFlowUiState(state.getStateJson());

            Map<String, FlowUiStateResponse.FlowUiPosition> prunedPositions = new LinkedHashMap<>(parsed.positions());
            boolean changed = prunedPositions.remove(nodeId) != null;

            List<FlowUiStateResponse.FlowUiEdge> prunedEdges = parsed.edges().stream()
                    .filter(edge -> !Objects.equals(edge.source(), nodeId) && !Objects.equals(edge.target(), nodeId))
                    .toList();
            if (prunedEdges.size() != parsed.edges().size()) {
                changed = true;
            }

            List<FlowUiStateResponse.FlowUiCustomNode> prunedCustomNodes = parsed.customNodes().stream()
                    .filter(customNode -> !Objects.equals(customNode.id(), nodeId))
                    .toList();
            if (prunedCustomNodes.size() != parsed.customNodes().size()) {
                changed = true;
            }

            if (!changed) {
                continue;
            }

            savePrunedFlowUiState(state, prunedPositions, prunedEdges, prunedCustomNodes);
        }
    }

    private void savePrunedFlowUiState(
            FlowUiState state,
            Map<String, FlowUiStateResponse.FlowUiPosition> positions,
            List<FlowUiStateResponse.FlowUiEdge> edges,
            List<FlowUiStateResponse.FlowUiCustomNode> customNodes
    ) {
        state.setStateJson(serializeFlowUiState(new FlowUiStateResponse(0L, positions, edges, customNodes)));
        state.setVersion(sanitizeVersion(state.getVersion()) + 1);
        flowUiStateRepository.save(state);
    }

    private NodeRef parseNodeRef(String rawNodeId) {
        String nodeId = normalizeRequiredText(rawNodeId, 120);
        if (nodeId == null) {
            return null;
        }
        int separator = nodeId.indexOf('-');
        if (separator <= 0 || separator == nodeId.length() - 1) {
            return null;
        }
        String prefix = nodeId.substring(0, separator).toUpperCase(Locale.ROOT);
        String rawId = nodeId.substring(separator + 1).trim();
        long entityId;
        try {
            entityId = Long.parseLong(rawId);
        } catch (NumberFormatException ex) {
            return null;
        }
        if (entityId <= 0) {
            return null;
        }

        String nodeType = switch (prefix) {
            case "WR" -> ITEM_TYPE_WORK_REQUEST;
            case "TT" -> ITEM_TYPE_TECH_TASK;
            case "TS" -> ITEM_TYPE_TEST_SCENARIO;
            case "DP" -> ITEM_TYPE_DEPLOYMENT;
            case "DF" -> ITEM_TYPE_DEFECT;
            case "KB" -> ITEM_TYPE_KNOWLEDGE_BASE;
            default -> null;
        };
        if (nodeType == null) {
            return null;
        }
        return new NodeRef(prefix + "-" + entityId, nodeType, entityId);
    }

    private record NodeRef(String nodeId, String type, Long id) {
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
        if (PARENT_TYPE_WORK_REQUEST.equals(normalized)
                || PARENT_TYPE_TECH_TASK.equals(normalized)
                || PARENT_TYPE_TEST_SCENARIO.equals(normalized)
                || PARENT_TYPE_DEPLOYMENT.equals(normalized)
                || PARENT_TYPE_DEFECT.equals(normalized)) {
            return normalized;
        }
        return null;
    }

    private String normalizeItemType(String rawItemType) {
        String normalized = rawItemType.trim().toUpperCase(Locale.ROOT);
        if (ITEM_TYPE_TECH_TASK.equals(normalized)
                || ITEM_TYPE_TEST_SCENARIO.equals(normalized)
                || ITEM_TYPE_DEPLOYMENT.equals(normalized)
                || ITEM_TYPE_DEFECT.equals(normalized)
                || ITEM_TYPE_KNOWLEDGE_BASE.equals(normalized)) {
            return normalized;
        }
        return null;
    }

    private void validateParentChildRule(String parentType, String itemType) {
        if (PARENT_TYPE_WORK_REQUEST.equals(parentType)) {
            return; // WR can be parent of anything
        }
        if (PARENT_TYPE_TECH_TASK.equals(parentType) && (
                ITEM_TYPE_TEST_SCENARIO.equals(itemType)
                || ITEM_TYPE_DEPLOYMENT.equals(itemType)
                || ITEM_TYPE_DEFECT.equals(itemType)
                || ITEM_TYPE_KNOWLEDGE_BASE.equals(itemType))) {
            return;
        }
        if (PARENT_TYPE_TEST_SCENARIO.equals(parentType) && (
                ITEM_TYPE_DEFECT.equals(itemType)
                || ITEM_TYPE_KNOWLEDGE_BASE.equals(itemType))) {
            return;
        }
        if (PARENT_TYPE_DEPLOYMENT.equals(parentType) && ITEM_TYPE_KNOWLEDGE_BASE.equals(itemType)) {
            return;
        }
        if (PARENT_TYPE_DEFECT.equals(parentType) && ITEM_TYPE_KNOWLEDGE_BASE.equals(itemType)) {
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
            case PARENT_TYPE_WORK_REQUEST  -> "WR-" + req.parentId();
            case PARENT_TYPE_TECH_TASK     -> "TT-" + req.parentId();
            case PARENT_TYPE_TEST_SCENARIO -> "TS-" + req.parentId();
            case PARENT_TYPE_DEPLOYMENT    -> "DP-" + req.parentId();
            case PARENT_TYPE_DEFECT        -> "DF-" + req.parentId();
            default -> "WR-" + req.parentId();
        };
    }
}
