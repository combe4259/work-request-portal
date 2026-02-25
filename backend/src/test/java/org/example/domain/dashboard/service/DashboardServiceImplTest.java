package org.example.domain.dashboard.service;

import org.example.domain.dashboard.dto.DashboardResponse;
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
class DashboardServiceImplTest {

    @Mock
    private WorkRequestRepository workRequestRepository;

    @Mock
    private PortalUserRepository portalUserRepository;

    @InjectMocks
    private DashboardServiceImpl dashboardService;

    @Test
    @DisplayName("대시보드 조회 시 팀 필터와 KPI/업무목록/캘린더를 집계한다")
    void getDashboard() {
        WorkRequest inProgress = workRequest(1L, "WR-001", "개발중 업무", "기능개선", "높음", "개발중", 10L, 2L, LocalDate.now().plusDays(1));
        WorkRequest done = workRequest(2L, "WR-002", "완료 업무", "신규개발", "보통", "완료", 10L, 3L, LocalDate.now().plusDays(10));
        WorkRequest otherTeam = workRequest(3L, "WR-003", "타팀 업무", "기타", "낮음", "검토중", 20L, 4L, LocalDate.now().plusDays(2));

        PortalUser user2 = user(2L, "김개발");
        PortalUser user3 = user(3L, "이설계");

        when(workRequestRepository.findAll()).thenReturn(List.of(inProgress, done, otherTeam));
        when(portalUserRepository.findAllById(List.of(2L, 3L))).thenReturn(List.of(user2, user3));

        DashboardResponse response = dashboardService.getDashboard(10L);

        assertThat(response.kpi().todoCount()).isEqualTo(1);
        assertThat(response.kpi().inProgressCount()).isEqualTo(1);
        assertThat(response.kpi().doneCount()).isEqualTo(1);
        assertThat(response.kpi().urgentCount()).isEqualTo(1);

        assertThat(response.workRequests()).hasSize(2);
        assertThat(response.workRequests().get(0).docNo()).isEqualTo("WR-001");
        assertThat(response.workRequests().get(0).assignee()).isEqualTo("김개발");
        assertThat(response.workRequests().get(1).docNo()).isEqualTo("WR-002");
        assertThat(response.workRequests().get(1).assignee()).isEqualTo("이설계");

        assertThat(response.calendarEvents()).hasSize(2);
        assertThat(response.calendarEvents().get(0).docNo()).isEqualTo("WR-001");
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

    private PortalUser user(Long id, String name) {
        PortalUser user = new PortalUser();
        user.setId(id);
        user.setName(name);
        user.setEmail(name + "@example.com");
        user.setIsActive(true);
        return user;
    }
}
