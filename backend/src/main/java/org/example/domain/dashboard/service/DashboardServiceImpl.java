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
import org.example.global.team.TeamScopeUtil;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class DashboardServiceImpl implements DashboardService {

    private static final Set<String> IN_PROGRESS_STATUSES = Set.of(
            "검토중",
            "승인됨",
            "개발중",
            "테스트중",
            "실행중",
            "수정중",
            "검증중",
            "분석중",
            "진행중",
            "대기"
    );

    private final WorkRequestRepository workRequestRepository;
    private final TechTaskRepository techTaskRepository;
    private final TestScenarioRepository testScenarioRepository;
    private final DefectRepository defectRepository;
    private final DeploymentRepository deploymentRepository;
    private final PortalUserRepository portalUserRepository;
    private final JwtTokenProvider jwtTokenProvider;

    public DashboardServiceImpl(
            WorkRequestRepository workRequestRepository,
            TechTaskRepository techTaskRepository,
            TestScenarioRepository testScenarioRepository,
            DefectRepository defectRepository,
            DeploymentRepository deploymentRepository,
            PortalUserRepository portalUserRepository,
            JwtTokenProvider jwtTokenProvider
    ) {
        this.workRequestRepository = workRequestRepository;
        this.techTaskRepository = techTaskRepository;
        this.testScenarioRepository = testScenarioRepository;
        this.defectRepository = defectRepository;
        this.deploymentRepository = deploymentRepository;
        this.portalUserRepository = portalUserRepository;
        this.jwtTokenProvider = jwtTokenProvider;
    }

    @Override
    public DashboardResponse getDashboard(Long teamId, String scope, String domain, String authorizationHeader) {
        Long scopedTeamId = resolveTeamScope(teamId);
        ScopeType scopeType = resolveScope(scope);
        DomainType domainType = resolveDomain(domain);

        List<UnifiedDashboardItem> allItems = loadAllItems(scopedTeamId);
        List<UnifiedDashboardItem> scopedItems = applyScope(allItems, scopeType, authorizationHeader);
        List<UnifiedDashboardItem> filteredItems = applyDomainFilter(scopedItems, domainType);

        Map<Long, String> assigneeNameById = getUserNameMap(filteredItems.stream()
                .map(UnifiedDashboardItem::assigneeId)
                .filter(id -> id != null)
                .distinct()
                .toList());

        LocalDate today = LocalDate.now();
        int todoCount = (int) filteredItems.stream()
                .filter(item -> item.assigneeId() != null && !isClosed(item))
                .count();
        int inProgressCount = (int) filteredItems.stream()
                .filter(item -> IN_PROGRESS_STATUSES.contains(item.status()))
                .count();
        int doneCount = (int) filteredItems.stream()
                .filter(this::isClosed)
                .count();
        int urgentCount = (int) filteredItems.stream()
                .filter(item -> isUrgent(item, today))
                .count();

        List<UnifiedDashboardItem> sortedItems = filteredItems.stream()
                .sorted(Comparator
                        .comparing(UnifiedDashboardItem::deadline, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(UnifiedDashboardItem::id, Comparator.reverseOrder()))
                .toList();

        List<DashboardResponse.DashboardWorkItem> workItems = sortedItems.stream()
                .map(item -> new DashboardResponse.DashboardWorkItem(
                        item.id(),
                        item.domain().name(),
                        item.docNo(),
                        item.title(),
                        item.type(),
                        item.priority(),
                        item.status(),
                        toAssigneeLabel(item.assigneeId(), assigneeNameById),
                        item.deadline()
                ))
                .toList();

        List<DashboardResponse.DashboardCalendarEvent> calendarEvents = sortedItems.stream()
                .filter(item -> item.deadline() != null)
                .map(item -> new DashboardResponse.DashboardCalendarEvent(
                        item.deadline().toString(),
                        item.deadline().getDayOfMonth(),
                        item.domain().name(),
                        item.docNo(),
                        item.title(),
                        item.priority()
                ))
                .toList();

        return new DashboardResponse(
                new DashboardResponse.KpiSummary(todoCount, inProgressCount, doneCount, urgentCount),
                workItems,
                calendarEvents
        );
    }

    private List<UnifiedDashboardItem> loadAllItems(Long teamId) {
        List<UnifiedDashboardItem> result = new ArrayList<>();
        result.addAll(loadWorkRequestItems(teamId));
        result.addAll(loadTechTaskItems(teamId));
        result.addAll(loadTestScenarioItems(teamId));
        result.addAll(loadDefectItems(teamId));
        result.addAll(loadDeploymentItems(teamId));
        return result;
    }

    private List<UnifiedDashboardItem> loadWorkRequestItems(Long teamId) {
        List<WorkRequest> rows = teamId == null
                ? workRequestRepository.findAll()
                : workRequestRepository.findByTeamId(teamId, Pageable.unpaged()).getContent();

        return rows.stream()
                .map(row -> new UnifiedDashboardItem(
                        row.getId(),
                        DomainType.WORK_REQUEST,
                        row.getRequestNo(),
                        row.getTitle(),
                        row.getType(),
                        defaultIfBlank(row.getPriority(), "-"),
                        defaultIfBlank(row.getStatus(), "-"),
                        row.getAssigneeId(),
                        row.getDeadline()
                ))
                .toList();
    }

    private List<UnifiedDashboardItem> loadTechTaskItems(Long teamId) {
        List<TechTask> rows = teamId == null
                ? techTaskRepository.findAll()
                : techTaskRepository.findByTeamId(teamId, Pageable.unpaged()).getContent();

        return rows.stream()
                .map(row -> new UnifiedDashboardItem(
                        row.getId(),
                        DomainType.TECH_TASK,
                        row.getTaskNo(),
                        row.getTitle(),
                        row.getType(),
                        defaultIfBlank(row.getPriority(), "-"),
                        defaultIfBlank(row.getStatus(), "-"),
                        row.getAssigneeId(),
                        row.getDeadline()
                ))
                .toList();
    }

    private List<UnifiedDashboardItem> loadTestScenarioItems(Long teamId) {
        List<TestScenario> rows = teamId == null
                ? testScenarioRepository.findAll()
                : testScenarioRepository.findByTeamId(teamId, Pageable.unpaged()).getContent();

        return rows.stream()
                .map(row -> new UnifiedDashboardItem(
                        row.getId(),
                        DomainType.TEST_SCENARIO,
                        row.getScenarioNo(),
                        row.getTitle(),
                        row.getType(),
                        defaultIfBlank(row.getPriority(), "-"),
                        defaultIfBlank(row.getStatus(), "-"),
                        row.getAssigneeId(),
                        row.getDeadline()
                ))
                .toList();
    }

    private List<UnifiedDashboardItem> loadDefectItems(Long teamId) {
        List<Defect> rows = teamId == null
                ? defectRepository.findAll()
                : defectRepository.findByTeamId(teamId, Pageable.unpaged()).getContent();

        return rows.stream()
                .map(row -> new UnifiedDashboardItem(
                        row.getId(),
                        DomainType.DEFECT,
                        row.getDefectNo(),
                        row.getTitle(),
                        row.getType(),
                        "치명적".equals(row.getSeverity()) ? "긴급" : defaultIfBlank(row.getSeverity(), "-"),
                        defaultIfBlank(row.getStatus(), "-"),
                        row.getAssigneeId(),
                        row.getDeadline()
                ))
                .toList();
    }

    private List<UnifiedDashboardItem> loadDeploymentItems(Long teamId) {
        List<Deployment> rows = teamId == null
                ? deploymentRepository.findAll()
                : deploymentRepository.findByTeamId(teamId, Pageable.unpaged()).getContent();

        return rows.stream()
                .map(row -> new UnifiedDashboardItem(
                        row.getId(),
                        DomainType.DEPLOYMENT,
                        row.getDeployNo(),
                        row.getTitle(),
                        row.getType(),
                        "-",
                        defaultIfBlank(row.getStatus(), "-"),
                        row.getManagerId(),
                        row.getScheduledAt()
                ))
                .toList();
    }

    private List<UnifiedDashboardItem> applyScope(
            List<UnifiedDashboardItem> items,
            ScopeType scopeType,
            String authorizationHeader
    ) {
        if (scopeType == ScopeType.TEAM) {
            return items;
        }

        Long currentUserId = resolveCurrentUserId(authorizationHeader);

        return items.stream()
                .filter(item -> currentUserId.equals(item.assigneeId()))
                .filter(item -> !isClosed(item))
                .toList();
    }

    private Long resolveCurrentUserId(String authorizationHeader) {
        Long currentUserId = TeamRequestContext.getCurrentUserId();
        if (currentUserId != null && currentUserId > 0) {
            return currentUserId;
        }

        String accessToken = extractBearerToken(authorizationHeader);
        if (accessToken == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        }
        return jwtTokenProvider.extractUserId(accessToken);
    }

    private String extractBearerToken(String authorizationHeader) {
        if (authorizationHeader == null || authorizationHeader.isBlank()) {
            return null;
        }

        String[] split = authorizationHeader.trim().split("\\s+", 2);
        if (split.length != 2 || !"Bearer".equalsIgnoreCase(split[0]) || split[1].isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Bearer 토큰 형식이 올바르지 않습니다.");
        }

        return split[1].trim();
    }

    private List<UnifiedDashboardItem> applyDomainFilter(List<UnifiedDashboardItem> items, DomainType domainType) {
        if (domainType == DomainType.ALL) {
            return items;
        }
        return items.stream()
                .filter(item -> item.domain() == domainType)
                .toList();
    }

    private boolean isClosed(UnifiedDashboardItem item) {
        String status = item.status();
        if (status == null) {
            return false;
        }

        return switch (item.domain()) {
            case WORK_REQUEST, TECH_TASK -> "완료".equals(status) || "반려".equals(status);
            case TEST_SCENARIO -> "통과".equals(status) || "실패".equals(status) || "보류".equals(status);
            case DEFECT -> "완료".equals(status) || "재현불가".equals(status) || "보류".equals(status);
            case DEPLOYMENT -> "완료".equals(status) || "실패".equals(status) || "롤백".equals(status);
            default -> false;
        };
    }

    private boolean isUrgent(UnifiedDashboardItem item, LocalDate today) {
        if (item.deadline() == null || isClosed(item)) {
            return false;
        }
        long diff = ChronoUnit.DAYS.between(today, item.deadline());
        return diff >= 0 && diff <= 3;
    }

    private ScopeType resolveScope(String scope) {
        if (scope == null || scope.isBlank()) {
            return ScopeType.TEAM;
        }

        String normalized = scope.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "team" -> ScopeType.TEAM;
            case "mine" -> ScopeType.MINE;
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "유효하지 않은 scope입니다.");
        };
    }

    private DomainType resolveDomain(String domain) {
        if (domain == null || domain.isBlank()) {
            return DomainType.ALL;
        }

        String normalized = domain.trim().toUpperCase(Locale.ROOT);
        return switch (normalized) {
            case "ALL" -> DomainType.ALL;
            case "WORK_REQUEST" -> DomainType.WORK_REQUEST;
            case "TECH_TASK" -> DomainType.TECH_TASK;
            case "TEST_SCENARIO" -> DomainType.TEST_SCENARIO;
            case "DEFECT" -> DomainType.DEFECT;
            case "DEPLOYMENT" -> DomainType.DEPLOYMENT;
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "유효하지 않은 domain입니다.");
        };
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

    private String defaultIfBlank(String value, String defaultValue) {
        if (value == null || value.isBlank()) {
            return defaultValue;
        }
        return value;
    }

    private enum ScopeType {
        TEAM,
        MINE
    }

    private enum DomainType {
        ALL,
        WORK_REQUEST,
        TECH_TASK,
        TEST_SCENARIO,
        DEFECT,
        DEPLOYMENT
    }

    private record UnifiedDashboardItem(
            Long id,
            DomainType domain,
            String docNo,
            String title,
            String type,
            String priority,
            String status,
            Long assigneeId,
            LocalDate deadline
    ) {
    }
}
