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
import org.example.global.team.TeamScopeUtil;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class StatisticsServiceImpl implements StatisticsService {

    private static final List<String> TYPE_ORDER = List.of("신규개발", "기능개선", "버그수정", "인프라", "기타");
    private static final List<String> DEFECT_SEVERITY_ORDER = List.of("치명적", "높음", "보통", "낮음");
    private static final List<String> STATUS_ORDER = List.of("접수대기", "검토중", "개발중", "테스트중", "완료", "반려");

    private final WorkRequestRepository workRequestRepository;
    private final DefectRepository defectRepository;
    private final DeploymentRepository deploymentRepository;
    private final PortalUserRepository portalUserRepository;

    public StatisticsServiceImpl(
            WorkRequestRepository workRequestRepository,
            DefectRepository defectRepository,
            DeploymentRepository deploymentRepository,
            PortalUserRepository portalUserRepository
    ) {
        this.workRequestRepository = workRequestRepository;
        this.defectRepository = defectRepository;
        this.deploymentRepository = deploymentRepository;
        this.portalUserRepository = portalUserRepository;
    }

    @Override
    public StatisticsResponse getStatistics(Long teamId) {
        Long scopedTeamId = resolveTeamScope(teamId);
        List<WorkRequest> workRequests = workRequestRepository.findAll().stream()
                .filter(item -> scopedTeamId == null || scopedTeamId.equals(item.getTeamId()))
                .toList();
        List<Defect> defects = defectRepository.findAll().stream()
                .filter(item -> scopedTeamId == null || scopedTeamId.equals(item.getTeamId()))
                .toList();
        List<Deployment> deployments = deploymentRepository.findAll().stream()
                .filter(item -> scopedTeamId == null || scopedTeamId.equals(item.getTeamId()))
                .toList();

        StatisticsResponse.Kpi kpi = buildKpi(workRequests, defects);
        List<StatisticsResponse.WeeklyTrendItem> weeklyTrend = buildWeeklyTrend(workRequests, defects, deployments);
        List<StatisticsResponse.TypeDistributionItem> typeDistribution = buildTypeDistribution(workRequests);
        List<StatisticsResponse.DefectSeverityItem> defectSeverity = buildDefectSeverity(defects);
        List<StatisticsResponse.MemberStatItem> memberStats = buildMemberStats(workRequests);
        List<StatisticsResponse.StatusFlowItem> statusFlow = buildStatusFlow(workRequests);

        return new StatisticsResponse(
                kpi,
                weeklyTrend,
                typeDistribution,
                defectSeverity,
                memberStats,
                statusFlow
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

    private StatisticsResponse.Kpi buildKpi(List<WorkRequest> workRequests, List<Defect> defects) {
        int totalRequests = workRequests.size();
        long doneCount = workRequests.stream().filter(item -> "완료".equals(item.getStatus())).count();
        int completionRate = totalRequests == 0 ? 0 : (int) Math.round((doneCount * 100.0) / totalRequests);

        double averageProcessingDays = workRequests.stream()
                .filter(item -> item.getCompletedAt() != null)
                .mapToLong(item -> {
                    LocalDateTime start = item.getStartedAt() != null ? item.getStartedAt() : item.getCreatedAt();
                    if (start == null) {
                        return 0L;
                    }
                    long days = ChronoUnit.DAYS.between(start.toLocalDate(), item.getCompletedAt().toLocalDate());
                    return Math.max(days, 0L);
                })
                .average()
                .orElse(0.0);

        int unresolvedDefects = (int) defects.stream()
                .filter(item -> !"완료".equals(item.getStatus()) && !"재현불가".equals(item.getStatus()))
                .count();

        return new StatisticsResponse.Kpi(
                totalRequests,
                roundOneDecimal(averageProcessingDays),
                completionRate,
                unresolvedDefects
        );
    }

    private List<StatisticsResponse.WeeklyTrendItem> buildWeeklyTrend(
            List<WorkRequest> workRequests,
            List<Defect> defects,
            List<Deployment> deployments
    ) {
        List<StatisticsResponse.WeeklyTrendItem> result = new ArrayList<>();
        LocalDate thisWeekStart = LocalDate.now().with(DayOfWeek.MONDAY);

        for (int i = 7; i >= 0; i--) {
            LocalDate weekStart = thisWeekStart.minusWeeks(i);
            LocalDate weekEnd = weekStart.plusDays(6);
            String weekLabel = weekStart.getMonthValue() + "/" + weekStart.getDayOfMonth() + "주";

            int wrCount = (int) workRequests.stream()
                    .filter(item -> isDateInRange(toLocalDate(item.getCreatedAt()), weekStart, weekEnd))
                    .count();
            int defectCount = (int) defects.stream()
                    .filter(item -> isDateInRange(toLocalDate(item.getCreatedAt()), weekStart, weekEnd))
                    .count();
            int deployCount = (int) deployments.stream()
                    .filter(item -> isDateInRange(toLocalDate(item.getCreatedAt()), weekStart, weekEnd))
                    .count();

            result.add(new StatisticsResponse.WeeklyTrendItem(weekLabel, wrCount, defectCount, deployCount));
        }

        return result;
    }

    private List<StatisticsResponse.TypeDistributionItem> buildTypeDistribution(List<WorkRequest> workRequests) {
        Map<String, Integer> countByType = new LinkedHashMap<>();
        for (String type : TYPE_ORDER) {
            countByType.put(type, 0);
        }

        for (WorkRequest item : workRequests) {
            String type = item.getType();
            if (type == null || type.isBlank()) {
                continue;
            }
            countByType.put(type, countByType.getOrDefault(type, 0) + 1);
        }

        return countByType.entrySet().stream()
                .map(entry -> new StatisticsResponse.TypeDistributionItem(entry.getKey(), entry.getValue()))
                .toList();
    }

    private List<StatisticsResponse.DefectSeverityItem> buildDefectSeverity(List<Defect> defects) {
        Map<String, Integer> countBySeverity = new LinkedHashMap<>();
        for (String severity : DEFECT_SEVERITY_ORDER) {
            countBySeverity.put(severity, 0);
        }

        for (Defect item : defects) {
            String severity = item.getSeverity();
            if (severity == null || severity.isBlank()) {
                continue;
            }
            countBySeverity.put(severity, countBySeverity.getOrDefault(severity, 0) + 1);
        }

        return countBySeverity.entrySet().stream()
                .map(entry -> new StatisticsResponse.DefectSeverityItem(entry.getKey(), entry.getValue()))
                .toList();
    }

    private List<StatisticsResponse.MemberStatItem> buildMemberStats(List<WorkRequest> workRequests) {
        Map<Long, String> userNameById = getUserNameMap(workRequests.stream()
                .map(WorkRequest::getAssigneeId)
                .filter(id -> id != null)
                .distinct()
                .toList());

        Map<Long, int[]> counterByUserId = new LinkedHashMap<>();
        for (WorkRequest item : workRequests) {
            Long assigneeId = item.getAssigneeId();
            if (assigneeId == null) {
                continue;
            }

            int[] counters = counterByUserId.computeIfAbsent(assigneeId, ignored -> new int[2]);
            if ("완료".equals(item.getStatus())) {
                counters[0] += 1;
            } else if ("개발중".equals(item.getStatus()) || "테스트중".equals(item.getStatus()) || "검토중".equals(item.getStatus())) {
                counters[1] += 1;
            }
        }

        return counterByUserId.entrySet().stream()
                .map(entry -> new StatisticsResponse.MemberStatItem(
                        userNameById.getOrDefault(entry.getKey(), "사용자#" + entry.getKey()),
                        entry.getValue()[0],
                        entry.getValue()[1]
                ))
                .toList();
    }

    private List<StatisticsResponse.StatusFlowItem> buildStatusFlow(List<WorkRequest> workRequests) {
        Map<String, Integer> countByStatus = new LinkedHashMap<>();
        for (String status : STATUS_ORDER) {
            countByStatus.put(status, 0);
        }

        for (WorkRequest item : workRequests) {
            String status = item.getStatus();
            if (status == null || status.isBlank()) {
                continue;
            }
            countByStatus.put(status, countByStatus.getOrDefault(status, 0) + 1);
        }

        return countByStatus.entrySet().stream()
                .map(entry -> new StatisticsResponse.StatusFlowItem(entry.getKey(), entry.getValue()))
                .toList();
    }

    private Map<Long, String> getUserNameMap(List<Long> userIds) {
        Map<Long, String> result = new HashMap<>();
        for (PortalUser user : portalUserRepository.findAllById(userIds)) {
            result.put(user.getId(), user.getName());
        }
        return result;
    }

    private LocalDate toLocalDate(LocalDateTime value) {
        return value == null ? null : value.toLocalDate();
    }

    private boolean isDateInRange(LocalDate value, LocalDate from, LocalDate to) {
        return value != null && !value.isBefore(from) && !value.isAfter(to);
    }

    private double roundOneDecimal(double value) {
        return Math.round(value * 10.0) / 10.0;
    }
}
