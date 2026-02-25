package org.example.domain.statistics.service;

import org.example.domain.defect.entity.Defect;
import org.example.domain.defect.repository.DefectRepository;
import org.example.domain.deployment.entity.Deployment;
import org.example.domain.deployment.repository.DeploymentRepository;
import org.example.domain.statistics.dto.StatisticsResponse;
import org.example.domain.user.entity.PortalUser;
import org.example.domain.user.repository.PortalUserRepository;
import org.example.domain.workRequest.entity.WorkRequest;
import org.example.domain.workRequest.repository.WorkRequestRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StatisticsServiceImplTest {

    @Mock
    private WorkRequestRepository workRequestRepository;

    @Mock
    private DefectRepository defectRepository;

    @Mock
    private DeploymentRepository deploymentRepository;

    @Mock
    private PortalUserRepository portalUserRepository;

    @InjectMocks
    private StatisticsServiceImpl statisticsService;

    @Test
    @DisplayName("통계 조회 시 KPI/분포/상태 집계를 반환한다")
    void getStatistics() {
        WorkRequest inProgress = workRequest(1L, 10L, "기능개선", "개발중", 2L, LocalDateTime.now().minusDays(1), null, null);
        WorkRequest done = workRequest(2L, 10L, "신규개발", "완료", 3L, LocalDateTime.now().minusDays(6), LocalDateTime.now().minusDays(5), LocalDateTime.now().minusDays(2));
        WorkRequest otherTeam = workRequest(3L, 20L, "기타", "검토중", 4L, LocalDateTime.now().minusDays(2), null, null);

        Defect openDefect = defect(1L, 10L, "치명적", "분석중", LocalDateTime.now().minusDays(2));
        Defect doneDefect = defect(2L, 10L, "낮음", "완료", LocalDateTime.now().minusDays(1));
        Defect otherTeamDefect = defect(3L, 20L, "높음", "분석중", LocalDateTime.now().minusDays(1));

        Deployment deploy = deployment(1L, 10L, LocalDateTime.now().minusDays(3));
        Deployment otherTeamDeploy = deployment(2L, 20L, LocalDateTime.now().minusDays(3));

        when(workRequestRepository.findAll()).thenReturn(List.of(inProgress, done, otherTeam));
        when(defectRepository.findAll()).thenReturn(List.of(openDefect, doneDefect, otherTeamDefect));
        when(deploymentRepository.findAll()).thenReturn(List.of(deploy, otherTeamDeploy));
        when(portalUserRepository.findAllById(List.of(2L, 3L))).thenReturn(List.of(user(2L, "김개발"), user(3L, "이설계")));

        StatisticsResponse response = statisticsService.getStatistics(10L);

        assertThat(response.kpi().totalRequests()).isEqualTo(2);
        assertThat(response.kpi().completionRate()).isEqualTo(50);
        assertThat(response.kpi().averageProcessingDays()).isEqualTo(3.0);
        assertThat(response.kpi().unresolvedDefects()).isEqualTo(1);

        assertThat(response.weeklyTrend()).hasSize(8);
        assertThat(response.weeklyTrend().stream().mapToInt(StatisticsResponse.WeeklyTrendItem::wr).sum()).isEqualTo(2);
        assertThat(response.weeklyTrend().stream().mapToInt(StatisticsResponse.WeeklyTrendItem::defect).sum()).isEqualTo(2);
        assertThat(response.weeklyTrend().stream().mapToInt(StatisticsResponse.WeeklyTrendItem::deploy).sum()).isEqualTo(1);

        assertThat(response.typeDistribution()).contains(
                new StatisticsResponse.TypeDistributionItem("신규개발", 1),
                new StatisticsResponse.TypeDistributionItem("기능개선", 1)
        );

        assertThat(response.defectSeverity()).contains(
                new StatisticsResponse.DefectSeverityItem("치명적", 1),
                new StatisticsResponse.DefectSeverityItem("낮음", 1)
        );

        assertThat(response.memberStats()).contains(
                new StatisticsResponse.MemberStatItem("김개발", 0, 1),
                new StatisticsResponse.MemberStatItem("이설계", 1, 0)
        );

        assertThat(response.statusFlow()).contains(
                new StatisticsResponse.StatusFlowItem("개발중", 1),
                new StatisticsResponse.StatusFlowItem("완료", 1)
        );
    }

    private WorkRequest workRequest(
            Long id,
            Long teamId,
            String type,
            String status,
            Long assigneeId,
            LocalDateTime createdAt,
            LocalDateTime startedAt,
            LocalDateTime completedAt
    ) {
        WorkRequest item = new WorkRequest();
        item.setId(id);
        item.setRequestNo("WR-" + id);
        item.setTitle("업무" + id);
        item.setType(type);
        item.setPriority("보통");
        item.setStatus(status);
        item.setTeamId(teamId);
        item.setRequesterId(99L);
        item.setAssigneeId(assigneeId);
        item.setDeadline(LocalDate.now().plusDays(7));
        item.setCreatedAt(createdAt);
        item.setStartedAt(startedAt);
        item.setCompletedAt(completedAt);
        return item;
    }

    private Defect defect(Long id, Long teamId, String severity, String status, LocalDateTime createdAt) {
        Defect defect = new Defect();
        defect.setId(id);
        defect.setDefectNo("DF-" + id);
        defect.setTitle("결함" + id);
        defect.setTeamId(teamId);
        defect.setSeverity(severity);
        defect.setStatus(status);
        defect.setCreatedAt(createdAt);
        return defect;
    }

    private Deployment deployment(Long id, Long teamId, LocalDateTime createdAt) {
        Deployment deployment = new Deployment();
        deployment.setId(id);
        deployment.setDeployNo("DP-" + id);
        deployment.setTitle("배포" + id);
        deployment.setTeamId(teamId);
        deployment.setVersion("v1.0." + id);
        deployment.setType("정기배포");
        deployment.setEnvironment("개발");
        deployment.setStatus("대기");
        deployment.setScheduledAt(LocalDate.now().plusDays(1));
        deployment.setCreatedAt(createdAt);
        return deployment;
    }

    private PortalUser user(Long id, String name) {
        PortalUser user = new PortalUser();
        user.setId(id);
        user.setName(name);
        user.setEmail(id + "@example.com");
        user.setIsActive(true);
        return user;
    }
}
