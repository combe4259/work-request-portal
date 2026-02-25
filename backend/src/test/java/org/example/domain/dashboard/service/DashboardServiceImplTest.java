package org.example.domain.dashboard.service;

import org.example.domain.dashboard.dto.DashboardResponse;
import org.example.domain.defect.entity.Defect;
import org.example.domain.defect.repository.DefectRepository;
import org.example.domain.deployment.entity.Deployment;
import org.example.domain.deployment.repository.DeploymentRepository;
import org.example.domain.techTask.entity.TechTask;
import org.example.domain.techTask.repository.TechTaskRepository;
import org.example.domain.testScenario.entity.TestScenario;
import org.example.domain.testScenario.repository.TestScenarioRepository;
import org.example.domain.user.entity.PortalUser;
import org.example.domain.user.repository.PortalUserRepository;
import org.example.domain.workRequest.entity.WorkRequest;
import org.example.domain.workRequest.repository.WorkRequestRepository;
import org.example.global.security.JwtTokenProvider;
import org.example.global.team.TeamRequestContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DashboardServiceImplTest {

    @Mock
    private WorkRequestRepository workRequestRepository;

    @Mock
    private TechTaskRepository techTaskRepository;

    @Mock
    private TestScenarioRepository testScenarioRepository;

    @Mock
    private DefectRepository defectRepository;

    @Mock
    private DeploymentRepository deploymentRepository;

    @Mock
    private PortalUserRepository portalUserRepository;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @InjectMocks
    private DashboardServiceImpl dashboardService;

    @AfterEach
    void tearDown() {
        TeamRequestContext.clear();
    }

    @Test
    @DisplayName("team 범위 집계 시 다도메인 KPI/목록/캘린더를 반환한다")
    void getDashboardTeamScope() {
        WorkRequest wr = workRequest(1L, "WR-001", "개발중 업무", "기능개선", "높음", "개발중", 10L, 2L, LocalDate.now().plusDays(1));
        TechTask tk = techTask(2L, "TK-001", "완료 과제", "리팩토링", "보통", "완료", 10L, 3L, LocalDate.now().plusDays(10));
        TestScenario ts = testScenario(3L, "TS-001", "검토 시나리오", "기능", "보통", "검토중", 10L, null, LocalDate.now().plusDays(2));
        Defect df = defect(4L, "DF-001", "보류 결함", "버그", "보통", "보류", 10L, 2L, LocalDate.now().plusDays(2));
        Deployment dp = deployment(5L, "DP-001", "진행 배포", "핫픽스", "진행중", 10L, 4L, LocalDate.now().plusDays(5));

        when(workRequestRepository.findByTeamId(any(Long.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(wr)));
        when(techTaskRepository.findByTeamId(any(Long.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(tk)));
        when(testScenarioRepository.findByTeamId(any(Long.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(ts)));
        when(defectRepository.findByTeamId(any(Long.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(df)));
        when(deploymentRepository.findByTeamId(any(Long.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(dp)));
        when(portalUserRepository.findAllById(List.of(2L, 3L, 4L)))
                .thenReturn(List.of(user(2L, "김개발"), user(3L, "이설계"), user(4L, "박배포")));

        DashboardResponse response = dashboardService.getDashboard(10L, "team", "ALL", null);

        assertThat(response.kpi().todoCount()).isEqualTo(2);
        assertThat(response.kpi().inProgressCount()).isEqualTo(3);
        assertThat(response.kpi().doneCount()).isEqualTo(2);
        assertThat(response.kpi().urgentCount()).isEqualTo(2);

        assertThat(response.workRequests()).hasSize(5);
        assertThat(response.workRequests().get(0).domain()).isEqualTo("WORK_REQUEST");
        assertThat(response.workRequests().get(0).assignee()).isEqualTo("김개발");
        assertThat(response.workRequests().stream().anyMatch(item -> "DEPLOYMENT".equals(item.domain()))).isTrue();

        assertThat(response.calendarEvents()).hasSize(5);
        assertThat(response.calendarEvents().get(0).domain()).isNotBlank();
    }

    @Test
    @DisplayName("mine 범위 집계 시 현재 사용자에게 배정된 미종결 항목만 반환한다")
    void getDashboardMineScope() {
        TeamRequestContext.set(2L, 10L);

        WorkRequest wr = workRequest(1L, "WR-001", "개발중 업무", "기능개선", "높음", "개발중", 10L, 2L, LocalDate.now().plusDays(1));
        Defect closed = defect(4L, "DF-001", "보류 결함", "버그", "보통", "보류", 10L, 2L, LocalDate.now().plusDays(2));
        TechTask otherUser = techTask(2L, "TK-001", "타인 과제", "리팩토링", "보통", "검토중", 10L, 3L, LocalDate.now().plusDays(10));

        when(workRequestRepository.findByTeamId(any(Long.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(wr)));
        when(techTaskRepository.findByTeamId(any(Long.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(otherUser)));
        when(testScenarioRepository.findByTeamId(any(Long.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.<TestScenario>of()));
        when(defectRepository.findByTeamId(any(Long.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(closed)));
        when(deploymentRepository.findByTeamId(any(Long.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.<Deployment>of()));
        when(portalUserRepository.findAllById(List.of(2L)))
                .thenReturn(List.of(user(2L, "김개발")));

        DashboardResponse response = dashboardService.getDashboard(10L, "mine", "ALL", null);

        assertThat(response.kpi().todoCount()).isEqualTo(1);
        assertThat(response.kpi().inProgressCount()).isEqualTo(1);
        assertThat(response.kpi().doneCount()).isEqualTo(0);
        assertThat(response.kpi().urgentCount()).isEqualTo(1);
        assertThat(response.workRequests()).hasSize(1);
        assertThat(response.workRequests().get(0).docNo()).isEqualTo("WR-001");
    }

    @Test
    @DisplayName("유효하지 않은 domain 값이면 400을 반환한다")
    void getDashboardInvalidDomain() {
        assertThatThrownBy(() -> dashboardService.getDashboard(10L, "team", "INVALID", null))
                .isInstanceOfSatisfying(ResponseStatusException.class, ex ->
                        assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST)
                );
    }

    @Test
    @DisplayName("mine 범위는 TeamRequestContext가 없어도 Authorization 헤더로 사용자 식별이 가능하다")
    void getDashboardMineScopeWithAuthorizationHeader() {
        WorkRequest wr = workRequest(1L, "WR-001", "개발중 업무", "기능개선", "높음", "개발중", 10L, 2L, LocalDate.now().plusDays(1));
        TechTask otherUser = techTask(2L, "TK-001", "타인 과제", "리팩토링", "보통", "검토중", 10L, 3L, LocalDate.now().plusDays(10));

        when(workRequestRepository.findByTeamId(any(Long.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(wr)));
        when(techTaskRepository.findByTeamId(any(Long.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(otherUser)));
        when(testScenarioRepository.findByTeamId(any(Long.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.<TestScenario>of()));
        when(defectRepository.findByTeamId(any(Long.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.<Defect>of()));
        when(deploymentRepository.findByTeamId(any(Long.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.<Deployment>of()));
        when(jwtTokenProvider.extractUserId("sample-token")).thenReturn(2L);
        when(portalUserRepository.findAllById(List.of(2L)))
                .thenReturn(List.of(user(2L, "김개발")));

        DashboardResponse response = dashboardService.getDashboard(10L, "mine", "ALL", "Bearer sample-token");

        assertThat(response.kpi().todoCount()).isEqualTo(1);
        assertThat(response.workRequests()).hasSize(1);
        assertThat(response.workRequests().get(0).docNo()).isEqualTo("WR-001");
    }

    private WorkRequest workRequest(
            Long id,
            String requestNo,
            String title,
            String type,
            String priority,
            String status,
            Long teamId,
            Long assigneeId,
            LocalDate deadline
    ) {
        WorkRequest entity = new WorkRequest();
        entity.setId(id);
        entity.setRequestNo(requestNo);
        entity.setTitle(title);
        entity.setType(type);
        entity.setPriority(priority);
        entity.setStatus(status);
        entity.setTeamId(teamId);
        entity.setRequesterId(99L);
        entity.setAssigneeId(assigneeId);
        entity.setDeadline(deadline);
        entity.setCreatedAt(LocalDateTime.now().minusDays(1));
        return entity;
    }

    private TechTask techTask(
            Long id,
            String taskNo,
            String title,
            String type,
            String priority,
            String status,
            Long teamId,
            Long assigneeId,
            LocalDate deadline
    ) {
        TechTask entity = new TechTask();
        entity.setId(id);
        entity.setTaskNo(taskNo);
        entity.setTitle(title);
        entity.setType(type);
        entity.setPriority(priority);
        entity.setStatus(status);
        entity.setTeamId(teamId);
        entity.setRegistrantId(99L);
        entity.setAssigneeId(assigneeId);
        entity.setDeadline(deadline);
        return entity;
    }

    private TestScenario testScenario(
            Long id,
            String scenarioNo,
            String title,
            String type,
            String priority,
            String status,
            Long teamId,
            Long assigneeId,
            LocalDate deadline
    ) {
        TestScenario entity = new TestScenario();
        entity.setId(id);
        entity.setScenarioNo(scenarioNo);
        entity.setTitle(title);
        entity.setType(type);
        entity.setPriority(priority);
        entity.setStatus(status);
        entity.setTeamId(teamId);
        entity.setAssigneeId(assigneeId);
        entity.setDeadline(deadline);
        entity.setCreatedBy(99L);
        return entity;
    }

    private Defect defect(
            Long id,
            String defectNo,
            String title,
            String type,
            String severity,
            String status,
            Long teamId,
            Long assigneeId,
            LocalDate deadline
    ) {
        Defect entity = new Defect();
        entity.setId(id);
        entity.setDefectNo(defectNo);
        entity.setTitle(title);
        entity.setType(type);
        entity.setSeverity(severity);
        entity.setStatus(status);
        entity.setTeamId(teamId);
        entity.setAssigneeId(assigneeId);
        entity.setReporterId(88L);
        entity.setDeadline(deadline);
        entity.setExpectedBehavior("expected");
        entity.setActualBehavior("actual");
        return entity;
    }

    private Deployment deployment(
            Long id,
            String deployNo,
            String title,
            String type,
            String status,
            Long teamId,
            Long managerId,
            LocalDate scheduledAt
    ) {
        Deployment entity = new Deployment();
        entity.setId(id);
        entity.setDeployNo(deployNo);
        entity.setTitle(title);
        entity.setType(type);
        entity.setStatus(status);
        entity.setTeamId(teamId);
        entity.setManagerId(managerId);
        entity.setVersion("1.0.0");
        entity.setEnvironment("운영");
        entity.setScheduledAt(scheduledAt);
        return entity;
    }

    private PortalUser user(Long id, String name) {
        PortalUser user = new PortalUser();
        user.setId(id);
        user.setName(name);
        user.setEmail(name + "@example.com");
        user.setIsActive(true);
        return user;
    }
}
