package org.example.domain.flow.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.domain.defect.entity.Defect;
import org.example.domain.defect.repository.DefectRepository;
import org.example.domain.deployment.entity.Deployment;
import org.example.domain.deployment.repository.DeploymentRelatedRefRepository;
import org.example.domain.deployment.repository.DeploymentRepository;
import org.example.domain.flow.dto.FlowChainResponse;
import org.example.domain.flow.dto.FlowItemCreateRequest;
import org.example.domain.flow.dto.FlowItemCreateResponse;
import org.example.domain.flow.dto.FlowUiStateRequest;
import org.example.domain.flow.entity.FlowUiState;
import org.example.domain.flow.realtime.FlowUiRealtimeService;
import org.example.domain.flow.repository.FlowUiStateRepository;
import org.example.domain.knowledgeBase.repository.KnowledgeBaseArticleRepository;
import org.example.domain.knowledgeBase.repository.KnowledgeBaseRelatedRefRepository;
import org.example.domain.techTask.entity.TechTask;
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
import org.example.global.util.DocumentNoGenerator;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FlowChainServiceTest {

    @Mock
    private WorkRequestRepository workRequestRepository;

    @Mock
    private WorkRequestRelatedRefRepository workRequestRelatedRefRepository;

    @Mock
    private TechTaskRepository techTaskRepository;

    @Mock
    private TechTaskRelatedRefRepository techTaskRelatedRefRepository;

    @Mock
    private TestScenarioRepository testScenarioRepository;

    @Mock
    private TestScenarioRelatedRefRepository testScenarioRelatedRefRepository;

    @Mock
    private DeploymentRepository deploymentRepository;

    @Mock
    private DeploymentRelatedRefRepository deploymentRelatedRefRepository;

    @Mock
    private DefectRepository defectRepository;

    @Mock
    private KnowledgeBaseArticleRepository knowledgeBaseArticleRepository;

    @Mock
    private KnowledgeBaseRelatedRefRepository knowledgeBaseRelatedRefRepository;

    @Mock
    private FlowUiStateRepository flowUiStateRepository;

    @Mock
    private FlowUiRealtimeService flowUiRealtimeService;

    @Mock
    private PortalUserRepository portalUserRepository;

    @Mock
    private DocumentNoGenerator documentNoGenerator;

    @Mock
    private ObjectMapper objectMapper;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @InjectMocks
    private FlowChainService flowChainService;

    @AfterEach
    void tearDownContext() {
        TeamRequestContext.clear();
    }

    @Test
    @DisplayName("카드 추가(기술과제)는 스키마 호환 기본값으로 생성한다")
    void createFlowItemTechTaskWithSchemaDefaults() {
        when(workRequestRepository.findById(15L)).thenReturn(Optional.of(sampleWorkRequest(15L)));
        when(documentNoGenerator.next("TK")).thenReturn("TK-001");
        when(techTaskRepository.save(any(TechTask.class))).thenAnswer(invocation -> {
            TechTask task = invocation.getArgument(0);
            task.setId(31L);
            return task;
        });

        FlowItemCreateResponse response = flowChainService.createFlowItem(
                15L,
                new FlowItemCreateRequest("WORK_REQUEST", 15L, "TECH_TASK", "로그인 API 보강")
        );

        ArgumentCaptor<TechTask> taskCaptor = ArgumentCaptor.forClass(TechTask.class);
        verify(techTaskRepository).save(taskCaptor.capture());

        TechTask saved = taskCaptor.getValue();
        assertThat(saved.getType()).isEqualTo("기타");
        assertThat(saved.getStatus()).isEqualTo("접수대기");

        assertThat(response.nodeType()).isEqualTo("TECH_TASK");
        assertThat(response.docNo()).isEqualTo("TK-001");
        assertThat(response.edgeSource()).isEqualTo("WR-15");
    }

    @Test
    @DisplayName("카드 추가(테스트)는 스키마 호환 기본값으로 생성한다")
    void createFlowItemTestScenarioWithSchemaDefaults() {
        when(workRequestRepository.findById(15L)).thenReturn(Optional.of(sampleWorkRequest(15L)));

        TechTask parentTask = new TechTask();
        parentTask.setId(22L);
        parentTask.setTeamId(10L);
        when(techTaskRepository.findById(22L)).thenReturn(Optional.of(parentTask));
        when(workRequestRelatedRefRepository.existsByWorkRequestIdAndRefTypeAndRefId(15L, "TECH_TASK", 22L))
                .thenReturn(true);

        when(documentNoGenerator.next("TS")).thenReturn("TS-001");
        when(testScenarioRepository.save(any(TestScenario.class))).thenAnswer(invocation -> {
            TestScenario scenario = invocation.getArgument(0);
            scenario.setId(41L);
            return scenario;
        });

        FlowItemCreateResponse response = flowChainService.createFlowItem(
                15L,
                new FlowItemCreateRequest("TECH_TASK", 22L, "TEST_SCENARIO", "로그인 실패 케이스")
        );

        ArgumentCaptor<TestScenario> scenarioCaptor = ArgumentCaptor.forClass(TestScenario.class);
        verify(testScenarioRepository).save(scenarioCaptor.capture());

        TestScenario saved = scenarioCaptor.getValue();
        assertThat(saved.getType()).isEqualTo("기능");
        assertThat(saved.getStatus()).isEqualTo("작성중");

        assertThat(response.nodeType()).isEqualTo("TEST_SCENARIO");
        assertThat(response.docNo()).isEqualTo("TS-001");
        assertThat(response.edgeSource()).isEqualTo("TT-22");
    }

    @Test
    @DisplayName("카드 추가(배포)는 스키마 호환 기본값으로 생성한다")
    void createFlowItemDeploymentWithSchemaDefaults() {
        when(workRequestRepository.findById(15L)).thenReturn(Optional.of(sampleWorkRequest(15L)));
        when(documentNoGenerator.next("DP")).thenReturn("DP-001");
        when(deploymentRepository.save(any(Deployment.class))).thenAnswer(invocation -> {
            Deployment deployment = invocation.getArgument(0);
            deployment.setId(51L);
            return deployment;
        });

        FlowItemCreateResponse response = flowChainService.createFlowItem(
                15L,
                new FlowItemCreateRequest("WORK_REQUEST", 15L, "DEPLOYMENT", "로그인 기능 배포")
        );

        ArgumentCaptor<Deployment> deploymentCaptor = ArgumentCaptor.forClass(Deployment.class);
        verify(deploymentRepository).save(deploymentCaptor.capture());

        Deployment saved = deploymentCaptor.getValue();
        assertThat(saved.getType()).isEqualTo("정기배포");
        assertThat(saved.getStatus()).isEqualTo("대기");
        assertThat(saved.getEnvironment()).isEqualTo("개발");
        assertThat(saved.getVersion()).isEqualTo("v0.1.0");

        assertThat(response.nodeType()).isEqualTo("DEPLOYMENT");
        assertThat(response.docNo()).isEqualTo("DP-001");
        assertThat(response.edgeSource()).isEqualTo("WR-15");
    }

    @Test
    @DisplayName("WORK_REQUEST parentType에서 parentId가 경로와 다르면 400")
    void createFlowItemRejectsMismatchedParent() {
        when(workRequestRepository.findById(15L)).thenReturn(Optional.of(sampleWorkRequest(15L)));

        assertThatThrownBy(() -> flowChainService.createFlowItem(
                15L,
                new FlowItemCreateRequest("WORK_REQUEST", 999L, "TECH_TASK", "잘못된 요청")
        ))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException statusEx = (ResponseStatusException) ex;
                    assertThat(statusEx.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
                });
    }

    @Test
    @DisplayName("기술과제 하위에는 기술과제를 생성할 수 없다")
    void createFlowItemRejectsTechTaskUnderTechTask() {
        when(workRequestRepository.findById(15L)).thenReturn(Optional.of(sampleWorkRequest(15L)));

        assertThatThrownBy(() -> flowChainService.createFlowItem(
                15L,
                new FlowItemCreateRequest("TECH_TASK", 22L, "TECH_TASK", "허용되지 않음")
        ))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException statusEx = (ResponseStatusException) ex;
                    assertThat(statusEx.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
                });
    }

    @Test
    @DisplayName("부모 기술과제가 기준 업무요청과 연결되지 않으면 400")
    void createFlowItemRejectsUnlinkedParentTechTask() {
        when(workRequestRepository.findById(15L)).thenReturn(Optional.of(sampleWorkRequest(15L)));
        TechTask parentTask = new TechTask();
        parentTask.setId(22L);
        parentTask.setTeamId(10L);
        when(techTaskRepository.findById(22L)).thenReturn(Optional.of(parentTask));
        when(workRequestRelatedRefRepository.existsByWorkRequestIdAndRefTypeAndRefId(15L, "TECH_TASK", 22L))
                .thenReturn(false);
        when(techTaskRelatedRefRepository.existsByTechTaskIdAndRefTypeAndRefId(22L, "WORK_REQUEST", 15L))
                .thenReturn(false);

        assertThatThrownBy(() -> flowChainService.createFlowItem(
                15L,
                new FlowItemCreateRequest("TECH_TASK", 22L, "TEST_SCENARIO", "연결 확인")
        ))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException statusEx = (ResponseStatusException) ex;
                    assertThat(statusEx.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
                });
    }

    @Test
    @DisplayName("부모 기술과제 팀이 기준 업무요청 팀과 다르면 400")
    void createFlowItemRejectsParentTeamMismatch() {
        when(workRequestRepository.findById(15L)).thenReturn(Optional.of(sampleWorkRequest(15L)));
        TechTask parentTask = new TechTask();
        parentTask.setId(22L);
        parentTask.setTeamId(20L);
        when(techTaskRepository.findById(22L)).thenReturn(Optional.of(parentTask));

        assertThatThrownBy(() -> flowChainService.createFlowItem(
                15L,
                new FlowItemCreateRequest("TECH_TASK", 22L, "TEST_SCENARIO", "팀 불일치")
        ))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException statusEx = (ResponseStatusException) ex;
                    assertThat(statusEx.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
                });
    }

    @Test
    @DisplayName("직접 연결된 결함은 기존 노드가 있어도 WR 엣지가 포함된다")
    void getFlowChainIncludesDirectDefectEdgeEvenWhenNodeAlreadyExists() {
        WorkRequest workRequest = sampleWorkRequest(15L);
        workRequest.setRequestNo("WR-015");
        workRequest.setTitle("로그인 개선 요청");
        workRequest.setStatus("요청");
        workRequest.setPriority("보통");
        when(workRequestRepository.findById(15L)).thenReturn(Optional.of(workRequest));

        WorkRequestRelatedRef tsRef = new WorkRequestRelatedRef();
        tsRef.setWorkRequestId(15L);
        tsRef.setRefType("TEST_SCENARIO");
        tsRef.setRefId(1L);
        tsRef.setSortOrder(0);

        WorkRequestRelatedRef directDefectRef = new WorkRequestRelatedRef();
        directDefectRef.setWorkRequestId(15L);
        directDefectRef.setRefType("DEFECT");
        directDefectRef.setRefId(101L);
        directDefectRef.setSortOrder(1);
        when(workRequestRelatedRefRepository.findByWorkRequestIdOrderBySortOrderAscIdAsc(15L))
                .thenReturn(List.of(tsRef, directDefectRef));

        TestScenario testScenario = new TestScenario();
        testScenario.setId(1L);
        testScenario.setScenarioNo("TS-001");
        testScenario.setTitle("로그인 실패 시나리오");
        testScenario.setStatus("작성중");
        testScenario.setPriority("보통");
        when(testScenarioRepository.findAllById(any())).thenReturn(List.of(testScenario));

        TestScenarioRelatedRef tsDefectRef = new TestScenarioRelatedRef();
        tsDefectRef.setTestScenarioId(1L);
        tsDefectRef.setRefType("DEFECT");
        tsDefectRef.setRefId(101L);
        when(testScenarioRelatedRefRepository.findByTestScenarioIdOrderByIdAsc(1L))
                .thenReturn(List.of(tsDefectRef));

        Defect defect = new Defect();
        defect.setId(101L);
        defect.setDefectNo("DF-101");
        defect.setTitle("로그인 실패 결함");
        defect.setStatus("접수");
        defect.setSeverity("보통");
        when(defectRepository.findAllById(any())).thenReturn(List.of(defect));

        when(techTaskRepository.findAllById(any())).thenReturn(List.of());
        when(deploymentRepository.findAllById(any())).thenReturn(List.of());
        when(knowledgeBaseArticleRepository.findAllById(any())).thenReturn(List.of());
        when(portalUserRepository.findAllById(any())).thenReturn(List.of());

        FlowChainResponse response = flowChainService.getFlowChain(15L);

        assertThat(response.edges())
                .extracting(edge -> edge.source() + "->" + edge.target())
                .contains("TS-1->DF-101", "WR-15->DF-101");
    }

    @Test
    @DisplayName("Flow UI 저장은 expectedVersion이 다르면 409")
    void saveFlowUiStateRejectsVersionConflict() {
        TeamRequestContext.set(2L, 10L);
        when(workRequestRepository.findById(15L)).thenReturn(Optional.of(sampleWorkRequest(15L)));

        FlowUiState existing = new FlowUiState();
        existing.setId(1L);
        existing.setWorkRequestId(15L);
        existing.setUserId(2L);
        existing.setTeamId(10L);
        existing.setVersion(3L);
        existing.setStateJson("{}");
        when(flowUiStateRepository.findByWorkRequestIdAndUserId(15L, 2L)).thenReturn(Optional.of(existing));

        FlowUiStateRequest request = new FlowUiStateRequest(
                2L,
                Map.of("WR-15", new FlowUiStateRequest.FlowUiPosition(0, 0)),
                List.of(),
                List.of()
        );

        assertThatThrownBy(() -> flowChainService.saveFlowUiState(15L, request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException statusEx = (ResponseStatusException) ex;
                    assertThat(statusEx.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
                });
    }

    @Test
    @DisplayName("Flow UI 저장 성공 시 버전을 증가시키고 실시간 이벤트를 전송한다")
    void saveFlowUiStateIncrementsVersionAndPublishes() throws Exception {
        TeamRequestContext.set(2L, 10L);
        when(workRequestRepository.findById(15L)).thenReturn(Optional.of(sampleWorkRequest(15L)));

        FlowUiState existing = new FlowUiState();
        existing.setId(1L);
        existing.setWorkRequestId(15L);
        existing.setUserId(2L);
        existing.setTeamId(10L);
        existing.setVersion(0L);
        existing.setStateJson("{}");
        when(flowUiStateRepository.findByWorkRequestIdAndUserId(15L, 2L)).thenReturn(Optional.of(existing));
        when(objectMapper.writeValueAsString(any())).thenReturn("{\"positions\":{}}");
        when(flowUiStateRepository.updateStateWithVersion(
                15L, 2L, 10L, "{\"positions\":{}}", 0L, 1L
        )).thenReturn(1);

        FlowUiStateRequest request = new FlowUiStateRequest(
                0L,
                Map.of("WR-15", new FlowUiStateRequest.FlowUiPosition(12.5, 33.0)),
                List.of(new FlowUiStateRequest.FlowUiEdge("edge-a", "WR-15", "TT-1")),
                List.of()
        );

        flowChainService.saveFlowUiState(15L, request);

        verify(flowUiStateRepository).updateStateWithVersion(
                15L, 2L, 10L, "{\"positions\":{}}", 0L, 1L
        );
        verify(flowUiStateRepository, never()).save(any(FlowUiState.class));
        verify(flowUiRealtimeService).publishUpdated(15L, 2L);
    }

    @Test
    @DisplayName("Flow UI 저장 시 기존 레코드가 없으면 version=1로 신규 저장한다")
    void saveFlowUiStateCreatesRowWhenMissing() throws Exception {
        TeamRequestContext.set(2L, 10L);
        when(workRequestRepository.findById(15L)).thenReturn(Optional.of(sampleWorkRequest(15L)));
        when(flowUiStateRepository.findByWorkRequestIdAndUserId(15L, 2L)).thenReturn(Optional.empty());
        when(objectMapper.writeValueAsString(any())).thenReturn("{\"positions\":{}}");

        FlowUiStateRequest request = new FlowUiStateRequest(
                0L,
                Map.of("WR-15", new FlowUiStateRequest.FlowUiPosition(10, 20)),
                List.of(),
                List.of()
        );

        flowChainService.saveFlowUiState(15L, request);

        ArgumentCaptor<FlowUiState> stateCaptor = ArgumentCaptor.forClass(FlowUiState.class);
        verify(flowUiStateRepository).save(stateCaptor.capture());
        FlowUiState saved = stateCaptor.getValue();
        assertThat(saved.getVersion()).isEqualTo(1L);
        assertThat(saved.getWorkRequestId()).isEqualTo(15L);
        assertThat(saved.getUserId()).isEqualTo(2L);
        assertThat(saved.getTeamId()).isEqualTo(10L);
        verify(flowUiRealtimeService).publishUpdated(15L, 2L);
    }

    @Test
    @DisplayName("Flow UI 저장 시 조건부 업데이트 실패는 409를 반환한다")
    void saveFlowUiStateRejectsWhenConditionalUpdateFails() throws Exception {
        TeamRequestContext.set(2L, 10L);
        when(workRequestRepository.findById(15L)).thenReturn(Optional.of(sampleWorkRequest(15L)));

        FlowUiState existing = new FlowUiState();
        existing.setId(1L);
        existing.setWorkRequestId(15L);
        existing.setUserId(2L);
        existing.setTeamId(10L);
        existing.setVersion(0L);
        existing.setStateJson("{}");
        when(flowUiStateRepository.findByWorkRequestIdAndUserId(15L, 2L)).thenReturn(Optional.of(existing));
        when(objectMapper.writeValueAsString(any())).thenReturn("{\"positions\":{}}");
        when(flowUiStateRepository.updateStateWithVersion(
                15L, 2L, 10L, "{\"positions\":{}}", 0L, 1L
        )).thenReturn(0);

        FlowUiStateRequest request = new FlowUiStateRequest(
                0L,
                Map.of("WR-15", new FlowUiStateRequest.FlowUiPosition(10, 20)),
                List.of(),
                List.of()
        );

        assertThatThrownBy(() -> flowChainService.saveFlowUiState(15L, request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException statusEx = (ResponseStatusException) ex;
                    assertThat(statusEx.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
                });
        verify(flowUiRealtimeService, never()).publishUpdated(any(), any());
    }

    private WorkRequest sampleWorkRequest(Long id) {
        WorkRequest wr = new WorkRequest();
        wr.setId(id);
        wr.setTeamId(10L);
        wr.setRequesterId(2L);
        return wr;
    }
}
