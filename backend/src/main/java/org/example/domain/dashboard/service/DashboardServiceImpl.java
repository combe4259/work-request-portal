package org.example.domain.dashboard.service;

import org.example.domain.dashboard.dto.DashboardResponse;
import org.example.domain.user.entity.PortalUser;
import org.example.domain.user.repository.PortalUserRepository;
import org.example.domain.workRequest.entity.WorkRequest;
import org.example.domain.workRequest.repository.WorkRequestRepository;
import org.example.global.team.TeamScopeUtil;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class DashboardServiceImpl implements DashboardService {

    private final WorkRequestRepository workRequestRepository;
    private final PortalUserRepository portalUserRepository;

    public DashboardServiceImpl(
            WorkRequestRepository workRequestRepository,
            PortalUserRepository portalUserRepository
    ) {
        this.workRequestRepository = workRequestRepository;
        this.portalUserRepository = portalUserRepository;
    }

    @Override
    public DashboardResponse getDashboard(Long teamId) {
        Long scopedTeamId = resolveTeamScope(teamId);
        List<WorkRequest> filtered = workRequestRepository.findAll().stream()
                .filter(item -> scopedTeamId == null || scopedTeamId.equals(item.getTeamId()))
                .toList();

        Map<Long, String> assigneeNameById = getUserNameMap(filtered.stream()
                .map(WorkRequest::getAssigneeId)
                .filter(id -> id != null)
                .distinct()
                .toList());

        LocalDate today = LocalDate.now();
        int todoCount = (int) filtered.stream()
                .filter(item -> item.getAssigneeId() != null && !"완료".equals(item.getStatus()))
                .count();
        int inProgressCount = (int) filtered.stream()
                .filter(item -> "개발중".equals(item.getStatus()) || "테스트중".equals(item.getStatus()) || "검토중".equals(item.getStatus()))
                .count();
        int doneCount = (int) filtered.stream()
                .filter(item -> "완료".equals(item.getStatus()))
                .count();
        int urgentCount = (int) filtered.stream()
                .filter(item -> item.getDeadline() != null)
                .filter(item -> {
                    long diff = ChronoUnit.DAYS.between(today, item.getDeadline());
                    return diff >= 0 && diff <= 3;
                })
                .count();

        List<DashboardResponse.DashboardWorkItem> workItems = filtered.stream()
                .sorted(Comparator
                        .comparing(WorkRequest::getDeadline, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(WorkRequest::getId, Comparator.reverseOrder()))
                .map(item -> new DashboardResponse.DashboardWorkItem(
                        item.getId(),
                        item.getRequestNo(),
                        item.getTitle(),
                        item.getType(),
                        item.getPriority(),
                        item.getStatus(),
                        toAssigneeLabel(item.getAssigneeId(), assigneeNameById),
                        item.getDeadline()
                ))
                .toList();

        List<DashboardResponse.DashboardCalendarEvent> calendarEvents = filtered.stream()
                .filter(item -> item.getDeadline() != null)
                .sorted(Comparator.comparing(WorkRequest::getDeadline))
                .map(item -> new DashboardResponse.DashboardCalendarEvent(
                        item.getDeadline().toString(),
                        item.getDeadline().getDayOfMonth(),
                        item.getRequestNo(),
                        item.getTitle(),
                        item.getPriority()
                ))
                .toList();

        return new DashboardResponse(
                new DashboardResponse.KpiSummary(todoCount, inProgressCount, doneCount, urgentCount),
                workItems,
                calendarEvents
        );
    }

    private Long resolveTeamScope(Long teamId) {
        Long currentTeamId = TeamScopeUtil.currentTeamId();
        if (currentTeamId == null) {
            return teamId;
        }
        if (teamId != null && !currentTeamId.equals(teamId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "선택한 팀으로만 조회할 수 있습니다.");
        }
        return currentTeamId;
    }

    private Map<Long, String> getUserNameMap(List<Long> userIds) {
        Map<Long, String> result = new HashMap<>();
        for (PortalUser user : portalUserRepository.findAllById(userIds)) {
            result.put(user.getId(), user.getName());
        }
        return result;
    }

    private String toAssigneeLabel(Long assigneeId, Map<Long, String> nameById) {
        if (assigneeId == null) {
            return "미배정";
        }
        return nameById.getOrDefault(assigneeId, "사용자#" + assigneeId);
    }
}
