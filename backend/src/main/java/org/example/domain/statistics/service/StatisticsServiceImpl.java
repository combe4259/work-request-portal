package org.example.domain.statistics.service;

import org.example.domain.defect.entity.Defect;
import org.example.domain.defect.repository.DefectRepository;
import org.example.domain.deployment.entity.Deployment;
import org.example.domain.deployment.repository.DeploymentRepository;
import org.example.domain.statistics.dto.StatisticsResponse;
import org.example.domain.techTask.entity.TechTask;
import org.example.domain.techTask.repository.TechTaskRepository;
import org.example.domain.testScenario.entity.TestScenario;
import org.example.domain.testScenario.repository.TestScenarioRepository;
import org.example.domain.user.entity.PortalUser;
import org.example.domain.user.repository.PortalUserRepository;
import org.example.domain.workRequest.entity.WorkRequest;
import org.example.domain.workRequest.repository.WorkRequestRepository;
import org.example.global.team.TeamScopeUtil;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class StatisticsServiceImpl implements StatisticsService {

    private static final Set<String> TERMINAL_WR_TK   = Set.of("완료", "반려");
    private static final Set<String> TERMINAL_TS       = Set.of("통과", "실패", "보류");
    private static final Set<String> TERMINAL_DEFECT   = Set.of("완료", "재현불가", "보류");
    private static final Set<String> TERMINAL_DEPLOY   = Set.of("완료", "실패", "롤백");
    private static final List<String> DEFECT_SEVERITY_ORDER = List.of("치명적", "높음", "보통", "낮음");

    private final WorkRequestRepository workRequestRepository;
    private final TechTaskRepository techTaskRepository;
    private final TestScenarioRepository testScenarioRepository;
    private final DefectRepository defectRepository;
    private final DeploymentRepository deploymentRepository;
    private final PortalUserRepository portalUserRepository;

    public StatisticsServiceImpl(
            WorkRequestRepository workRequestRepository,
            TechTaskRepository techTaskRepository,
            TestScenarioRepository testScenarioRepository,
            DefectRepository defectRepository,
            DeploymentRepository deploymentRepository,
            PortalUserRepository portalUserRepository
    ) {
        this.workRequestRepository = workRequestRepository;
        this.techTaskRepository = techTaskRepository;
        this.testScenarioRepository = testScenarioRepository;
        this.defectRepository = defectRepository;
        this.deploymentRepository = deploymentRepository;
        this.portalUserRepository = portalUserRepository;
    }

    @Override
    public StatisticsResponse getStatistics(Long teamId, int days) {
        Long scopedTeamId = resolveTeamScope(teamId);
        int safeDays = (days == 7 || days == 14 || days == 30) ? days : 30;

        List<RawItem> allItems = loadAllItems(scopedTeamId);

        return new StatisticsResponse(
                buildKpi(allItems),
                buildBurndown(allItems, safeDays),
                buildStatusSnapshot(allItems),
                buildDefectSeverity(scopedTeamId),
                buildMemberStats(scopedTeamId)
        );
    }

    // ── 데이터 로딩 ────────────────────────────────────────

    private List<RawItem> loadAllItems(Long teamId) {
        List<RawItem> result = new ArrayList<>();

        workRequestRepository.findAll().stream()
                .filter(r -> teamId == null || teamId.equals(r.getTeamId()))
                .map(r -> new RawItem(
                        toDate(r.getCreatedAt()),
                        resolveClosedAt(r.getCompletedAt(), TERMINAL_WR_TK.contains(r.getStatus())),
                        TERMINAL_WR_TK.contains(r.getStatus()),
                        normalizeStatus(r.getStatus(), "WR"),
                        r.getDeadline(),
                        r.getAssigneeId(),
                        true
                ))
                .forEach(result::add);

        techTaskRepository.findAll().stream()
                .filter(r -> teamId == null || teamId.equals(r.getTeamId()))
                .map(r -> new RawItem(
                        toDate(r.getCreatedAt()),
                        resolveClosedAt(r.getCompletedAt(), TERMINAL_WR_TK.contains(r.getStatus())),
                        TERMINAL_WR_TK.contains(r.getStatus()),
                        normalizeStatus(r.getStatus(), "WR"),
                        r.getDeadline(),
                        r.getAssigneeId(),
                        true
                ))
                .forEach(result::add);

        testScenarioRepository.findAll().stream()
                .filter(r -> teamId == null || teamId.equals(r.getTeamId()))
                .map(r -> new RawItem(
                        toDate(r.getCreatedAt()),
                        resolveClosedAt(r.getExecutedAt(), TERMINAL_TS.contains(r.getStatus())),
                        TERMINAL_TS.contains(r.getStatus()),
                        normalizeStatus(r.getStatus(), "TS"),
                        r.getDeadline(),
                        r.getAssigneeId(),
                        false
                ))
                .forEach(result::add);

        defectRepository.findAll().stream()
                .filter(r -> teamId == null || teamId.equals(r.getTeamId()))
                .map(r -> new RawItem(
                        toDate(r.getCreatedAt()),
                        resolveClosedAt(r.getResolvedAt(), TERMINAL_DEFECT.contains(r.getStatus())),
                        TERMINAL_DEFECT.contains(r.getStatus()),
                        normalizeStatus(r.getStatus(), "DF"),
                        r.getDeadline(),
                        r.getAssigneeId(),
                        false
                ))
                .forEach(result::add);

        deploymentRepository.findAll().stream()
                .filter(r -> teamId == null || teamId.equals(r.getTeamId()))
                .map(r -> new RawItem(
                        toDate(r.getCreatedAt()),
                        resolveClosedAt(r.getCompletedAt(), TERMINAL_DEPLOY.contains(r.getStatus())),
                        TERMINAL_DEPLOY.contains(r.getStatus()),
                        normalizeStatus(r.getStatus(), "DP"),
                        null,
                        null,
                        false
                ))
                .forEach(result::add);

        return result;
    }

    // ── KPI ────────────────────────────────────────────────

    private StatisticsResponse.Kpi buildKpi(List<RawItem> items) {
        LocalDate today = LocalDate.now();
        LocalDate monthStart = today.withDayOfMonth(1);

        int incompleteCount = (int) items.stream()
                .filter(item -> !item.isClosed())
                .count();

        int overdueCount = (int) items.stream()
                .filter(item -> !item.isClosed()
                        && item.deadline() != null
                        && item.deadline().isBefore(today))
                .count();

        int completedThisMonth = (int) items.stream()
                .filter(item -> item.isClosed()
                        && item.closedAt() != null
                        && !item.closedAt().isBefore(monthStart))
                .count();

        double avgDays = items.stream()
                .filter(item -> item.isClosed()
                        && item.createdAt() != null
                        && item.closedAt() != null)
                .mapToLong(item -> Math.max(0, ChronoUnit.DAYS.between(item.createdAt(), item.closedAt())))
                .average()
                .orElse(0.0);

        return new StatisticsResponse.Kpi(
                incompleteCount,
                overdueCount,
                completedThisMonth,
                roundOneDecimal(avgDays)
        );
    }

    // ── 번다운 ─────────────────────────────────────────────

    private List<StatisticsResponse.BurndownItem> buildBurndown(List<RawItem> items, int days) {
        LocalDate today = LocalDate.now();
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("M/d");
        List<StatisticsResponse.BurndownItem> result = new ArrayList<>();

        for (int i = days - 1; i >= 0; i--) {
            LocalDate day = today.minusDays(i);
            int remaining = (int) items.stream()
                    .filter(item -> item.createdAt() != null && !item.createdAt().isAfter(day))
                    .filter(item -> !item.isClosed() || (item.closedAt() != null && item.closedAt().isAfter(day)))
                    .count();
            result.add(new StatisticsResponse.BurndownItem(day.format(fmt), remaining));
        }

        return result;
    }

    // ── 현재 상태 스냅샷 ───────────────────────────────────

    private List<StatisticsResponse.StatusSnapshotItem> buildStatusSnapshot(List<RawItem> items) {
        Map<String, Integer> counts = new LinkedHashMap<>();
        List<String> order = List.of("접수", "검토중", "개발중", "테스트중", "완료");
        for (String s : order) counts.put(s, 0);

        for (RawItem item : items) {
            String norm = item.normalizedStatus();
            if (counts.containsKey(norm)) {
                counts.put(norm, counts.get(norm) + 1);
            }
        }

        return counts.entrySet().stream()
                .map(e -> new StatisticsResponse.StatusSnapshotItem(e.getKey(), e.getValue()))
                .toList();
    }

    // ── 결함 심각도 ────────────────────────────────────────

    private List<StatisticsResponse.DefectSeverityItem> buildDefectSeverity(Long teamId) {
        Map<String, Integer> counts = new LinkedHashMap<>();
        for (String s : DEFECT_SEVERITY_ORDER) counts.put(s, 0);

        defectRepository.findAll().stream()
                .filter(r -> teamId == null || teamId.equals(r.getTeamId()))
                .forEach(r -> {
                    String sev = r.getSeverity();
                    if (sev != null && counts.containsKey(sev)) {
                        counts.put(sev, counts.get(sev) + 1);
                    }
                });

        return counts.entrySet().stream()
                .map(e -> new StatisticsResponse.DefectSeverityItem(e.getKey(), e.getValue()))
                .toList();
    }

    // ── 팀원별 현황 ────────────────────────────────────────

    private List<StatisticsResponse.MemberStatItem> buildMemberStats(Long teamId) {
        Map<Long, int[]> counterById = new LinkedHashMap<>();

        // WorkRequest + TechTask 기준
        workRequestRepository.findAll().stream()
                .filter(r -> teamId == null || teamId.equals(r.getTeamId()))
                .filter(r -> r.getAssigneeId() != null)
                .forEach(r -> {
                    int[] c = counterById.computeIfAbsent(r.getAssigneeId(), id -> new int[2]);
                    if (TERMINAL_WR_TK.contains(r.getStatus())) c[0]++;
                    else c[1]++;
                });

        techTaskRepository.findAll().stream()
                .filter(r -> teamId == null || teamId.equals(r.getTeamId()))
                .filter(r -> r.getAssigneeId() != null)
                .forEach(r -> {
                    int[] c = counterById.computeIfAbsent(r.getAssigneeId(), id -> new int[2]);
                    if (TERMINAL_WR_TK.contains(r.getStatus())) c[0]++;
                    else c[1]++;
                });

        Map<Long, String> nameById = getUserNameMap(counterById.keySet().stream().toList());

        return counterById.entrySet().stream()
                .map(e -> new StatisticsResponse.MemberStatItem(
                        nameById.getOrDefault(e.getKey(), "사용자#" + e.getKey()),
                        e.getValue()[0],
                        e.getValue()[1]
                ))
                .toList();
    }

    // ── 유틸 ───────────────────────────────────────────────

    /**
     * 상태를 5개 버킷으로 정규화
     * 접수 / 검토중 / 개발중 / 테스트중 / 완료
     */
    private String normalizeStatus(String status, String domain) {
        if (status == null) return "접수";
        return switch (status) {
            case "접수대기", "접수", "작성중", "대기" -> "접수";
            case "검토중", "승인됨", "제안됨" -> "검토중";
            case "개발중", "수정중", "분석중", "실행중", "진행중" -> "개발중";
            case "테스트중", "검증중" -> "테스트중";
            case "완료", "통과" -> "완료";
            default -> "완료"; // 반려/실패/롤백/재현불가/보류 → 완료 버킷
        };
    }

    /**
     * isClosed 이지만 closedAt 이 null 인 경우 today 로 처리 (번다운에서 오늘 이전은 remaining 으로 계산)
     */
    private LocalDate resolveClosedAt(LocalDateTime raw, boolean isClosed) {
        if (raw != null) return raw.toLocalDate();
        if (isClosed) return LocalDate.now();
        return null;
    }

    private LocalDate toDate(LocalDateTime ldt) {
        return ldt == null ? null : ldt.toLocalDate();
    }

    private double roundOneDecimal(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    private Long resolveTeamScope(Long teamId) {
        Long currentTeamId = TeamScopeUtil.currentTeamId();
        if (currentTeamId == null) return teamId;
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

    private record RawItem(
            LocalDate createdAt,
            LocalDate closedAt,
            boolean isClosed,
            String normalizedStatus,
            LocalDate deadline,
            Long assigneeId,
            boolean countForMember
    ) {
    }
}
