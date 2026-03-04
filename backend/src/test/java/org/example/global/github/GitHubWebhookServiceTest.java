package org.example.global.github;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.domain.activityLog.service.ActivityLogCreateCommand;
import org.example.domain.activityLog.service.ActivityLogService;
import org.example.domain.defect.dto.DefectStatusUpdateRequest;
import org.example.domain.defect.entity.Defect;
import org.example.domain.defect.repository.DefectRepository;
import org.example.domain.defect.service.DefectService;
import org.example.domain.deployment.repository.DeploymentRepository;
import org.example.domain.deployment.service.DeploymentService;
import org.example.domain.techTask.dto.TechTaskStatusUpdateRequest;
import org.example.domain.techTask.entity.TechTask;
import org.example.domain.techTask.entity.TechTaskPrLink;
import org.example.domain.techTask.repository.TechTaskPrLinkRepository;
import org.example.domain.techTask.repository.TechTaskRepository;
import org.example.domain.techTask.service.TechTaskService;
import org.example.domain.workRequest.dto.WorkRequestStatusUpdateRequest;
import org.example.domain.workRequest.entity.WorkRequest;
import org.example.domain.workRequest.repository.WorkRequestRepository;
import org.example.domain.workRequest.service.WorkRequestService;
import org.example.global.github.entity.GitHubRepoTeamMapping;
import org.example.global.github.entity.GitHubWebhookDelivery;
import org.example.global.github.entity.GitHubWebhookDeliveryStatus;
import org.example.global.github.repository.GitHubRepoTeamMappingRepository;
import org.example.global.github.repository.GitHubWebhookDeliveryRepository;
import org.example.global.team.TeamRequestContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GitHubWebhookServiceTest {

    @Mock
    private WorkRequestRepository workRequestRepository;

    @Mock
    private TechTaskRepository techTaskRepository;

    @Mock
    private DefectRepository defectRepository;

    @Mock
    private DeploymentRepository deploymentRepository;

    @Mock
    private TechTaskPrLinkRepository techTaskPrLinkRepository;

    @Mock
    private WorkRequestService workRequestService;

    @Mock
    private TechTaskService techTaskService;

    @Mock
    private DefectService defectService;

    @Mock
    private DeploymentService deploymentService;

    @Mock
    private ActivityLogService activityLogService;

    @Mock
    private GitHubRepoTeamMappingRepository gitHubRepoTeamMappingRepository;

    @Mock
    private GitHubWebhookDeliveryRepository gitHubWebhookDeliveryRepository;

    private GitHubWebhookService gitHubWebhookService;

    private Map<String, GitHubWebhookDelivery> deliveryStore;
    private AtomicLong deliverySequence;

    @BeforeEach
    void setUp() {
        deliveryStore = new HashMap<>();
        deliverySequence = new AtomicLong(0L);

        when(gitHubWebhookDeliveryRepository.findByDeliveryId(any())).thenAnswer(invocation -> {
            String deliveryId = invocation.getArgument(0);
            return Optional.ofNullable(deliveryStore.get(deliveryId));
        });

        when(gitHubWebhookDeliveryRepository.save(any(GitHubWebhookDelivery.class))).thenAnswer(invocation -> {
            GitHubWebhookDelivery entity = invocation.getArgument(0);
            if (entity.getId() == null) {
                entity.setId(deliverySequence.incrementAndGet());
            }
            deliveryStore.put(entity.getDeliveryId(), entity);
            return entity;
        });

        gitHubWebhookService = new GitHubWebhookService(
                new ObjectMapper(),
                workRequestRepository,
                techTaskRepository,
                defectRepository,
                deploymentRepository,
                techTaskPrLinkRepository,
                workRequestService,
                techTaskService,
                defectService,
                deploymentService,
                activityLogService,
                gitHubRepoTeamMappingRepository,
                gitHubWebhookDeliveryRepository,
                3,
                10,
                1,
                60
        );
    }

    @AfterEach
    void clearContext() {
        TeamRequestContext.clear();
    }

    @Test
    @DisplayName("PR opened 이벤트는 repo-team 매핑이 일치할 때만 PR 링크를 자동 생성한다")
    void createPrLinkOnOpenedEventWhenMapped() {
        TechTask techTask = techTask(15L, 100L, "TK-015", "접수대기");
        when(techTaskRepository.findByTaskNo("TK-15")).thenReturn(Optional.empty());
        when(techTaskRepository.findByTaskNo("TK-015")).thenReturn(Optional.of(techTask));
        when(techTaskPrLinkRepository.findByTechTaskIdAndPrNo(15L, "42")).thenReturn(Optional.empty());
        when(techTaskPrLinkRepository.findByTechTaskIdAndPrUrl(15L, "https://github.com/acme/repo/pull/42"))
                .thenReturn(Optional.empty());
        when(gitHubRepoTeamMappingRepository.findByRepositoryFullNameAndActiveTrue("acme/repo"))
                .thenReturn(Optional.of(mapping(100L, "acme/repo")));

        String payload = """
                {
                  "action":"opened",
                  "repository":{"full_name":"acme/repo"},
                  "pull_request":{
                    "number":42,
                    "html_url":"https://github.com/acme/repo/pull/42",
                    "title":"로그인 개선",
                    "body":"refs TT-15",
                    "head":{"ref":"feature/TT-15-login-jwt"}
                  }
                }
                """;

        gitHubWebhookService.handleEvent("delivery-1", "pull_request", payload);

        ArgumentCaptor<TechTaskPrLink> linkCaptor = ArgumentCaptor.forClass(TechTaskPrLink.class);
        verify(techTaskPrLinkRepository).save(linkCaptor.capture());
        verify(activityLogService).recordLog(any(ActivityLogCreateCommand.class));

        TechTaskPrLink saved = linkCaptor.getValue();
        assertThat(saved.getTechTaskId()).isEqualTo(15L);
        assertThat(saved.getPrNo()).isEqualTo("42");
        assertThat(saved.getPrUrl()).isEqualTo("https://github.com/acme/repo/pull/42");
        assertThat(saved.getBranchName()).isEqualTo("feature/TT-15-login-jwt");

        GitHubWebhookDelivery delivery = deliveryStore.get("delivery-1");
        assertThat(delivery.getStatus()).isEqualTo(GitHubWebhookDeliveryStatus.SUCCESS);
    }

    @Test
    @DisplayName("같은 delivery id가 다시 오면 멱등 처리되어 중복 동작하지 않는다")
    void skipDuplicateDelivery() {
        TechTask techTask = techTask(15L, 100L, "TK-015", "접수대기");
        when(techTaskRepository.findByTaskNo("TK-15")).thenReturn(Optional.empty());
        when(techTaskRepository.findByTaskNo("TK-015")).thenReturn(Optional.of(techTask));
        when(techTaskPrLinkRepository.findByTechTaskIdAndPrNo(15L, "42")).thenReturn(Optional.empty());
        when(techTaskPrLinkRepository.findByTechTaskIdAndPrUrl(15L, "https://github.com/acme/repo/pull/42"))
                .thenReturn(Optional.empty());
        when(gitHubRepoTeamMappingRepository.findByRepositoryFullNameAndActiveTrue("acme/repo"))
                .thenReturn(Optional.of(mapping(100L, "acme/repo")));

        String payload = """
                {
                  "action":"opened",
                  "repository":{"full_name":"acme/repo"},
                  "pull_request":{
                    "number":42,
                    "html_url":"https://github.com/acme/repo/pull/42",
                    "title":"TT-015 작업",
                    "head":{"ref":"feature/TK-015-refactor"}
                  }
                }
                """;

        gitHubWebhookService.handleEvent("delivery-dup", "pull_request", payload);
        gitHubWebhookService.handleEvent("delivery-dup", "pull_request", payload);

        verify(techTaskPrLinkRepository, times(1)).save(any(TechTaskPrLink.class));
    }

    @Test
    @DisplayName("repo-team 매핑과 팀이 불일치하면 PR 링크를 생성하지 않는다")
    void skipWhenRepoTeamMismatch() {
        TechTask techTask = techTask(15L, 100L, "TK-015", "접수대기");
        when(techTaskRepository.findByTaskNo("TK-15")).thenReturn(Optional.empty());
        when(techTaskRepository.findByTaskNo("TK-015")).thenReturn(Optional.of(techTask));
        when(gitHubRepoTeamMappingRepository.findByRepositoryFullNameAndActiveTrue("acme/repo"))
                .thenReturn(Optional.of(mapping(999L, "acme/repo")));

        String payload = """
                {
                  "action":"opened",
                  "repository":{"full_name":"acme/repo"},
                  "pull_request":{
                    "number":42,
                    "html_url":"https://github.com/acme/repo/pull/42",
                    "title":"TT-015 작업",
                    "head":{"ref":"feature/TK-015-refactor"}
                  }
                }
                """;

        gitHubWebhookService.handleEvent("delivery-mismatch", "pull_request", payload);

        verify(techTaskPrLinkRepository, never()).save(any(TechTaskPrLink.class));
    }

    @Test
    @DisplayName("PR merged 이벤트는 mapped team 문서만 자동 완료 처리한다")
    void completeDocsOnMergedEvent() {
        WorkRequest workRequest = workRequest(11L, 201L, "WR-015", "개발중");
        Defect defect = defect(21L, 202L, "DF-007", "수정중");
        TechTask techTask = techTask(31L, 201L, "TK-001", "테스트중");

        when(workRequestRepository.findByRequestNo("WR-015")).thenReturn(Optional.of(workRequest));
        when(defectRepository.findByDefectNo("DF-007")).thenReturn(Optional.of(defect));
        when(techTaskRepository.findByTaskNo("TK-001")).thenReturn(Optional.of(techTask));
        when(gitHubRepoTeamMappingRepository.findByRepositoryFullNameAndActiveTrue("acme/repo"))
                .thenReturn(Optional.of(mapping(201L, "acme/repo")));

        String payload = """
                {
                  "action":"closed",
                  "repository":{"full_name":"acme/repo"},
                  "pull_request":{
                    "number":77,
                    "merged":true,
                    "title":"로그인 버그 수정",
                    "body":"closes WR-015, fixes DF-007, resolves TK-001"
                  }
                }
                """;

        gitHubWebhookService.handleEvent("delivery-merged", "pull_request", payload);

        verify(workRequestService).updateStatus(eq(11L), any(WorkRequestStatusUpdateRequest.class));
        verify(techTaskService).updateStatus(eq(31L), any(TechTaskStatusUpdateRequest.class));
        verify(defectService, never()).updateStatus(eq(21L), any(DefectStatusUpdateRequest.class));
        assertThat(TeamRequestContext.getCurrentTeamId()).isNull();
    }

    @Test
    @DisplayName("처리 실패 시 FAILED로 저장하고 스케줄러 재시도로 성공하면 SUCCESS로 전환한다")
    void retryFailedDelivery() {
        when(gitHubWebhookDeliveryRepository.findById(any(Long.class))).thenAnswer(invocation -> {
            Long id = invocation.getArgument(0);
            return deliveryStore.values().stream()
                    .filter(item -> item != null && id.equals(item.getId()))
                    .findFirst();
        });
        when(gitHubWebhookDeliveryRepository.findByStatusAndNextRetryAtLessThanEqualOrderByNextRetryAtAscIdAsc(
                eq(GitHubWebhookDeliveryStatus.FAILED),
                any(LocalDateTime.class),
                any(Pageable.class)
        )).thenAnswer(invocation -> {
            LocalDateTime now = invocation.getArgument(1);
            Pageable pageable = invocation.getArgument(2);

            List<GitHubWebhookDelivery> candidates = deliveryStore.values().stream()
                    .filter(item -> item != null)
                    .filter(item -> item.getStatus() == GitHubWebhookDeliveryStatus.FAILED)
                    .filter(item -> item.getNextRetryAt() != null && !item.getNextRetryAt().isAfter(now))
                    .sorted(Comparator
                            .comparing(GitHubWebhookDelivery::getNextRetryAt)
                            .thenComparing(GitHubWebhookDelivery::getId))
                    .toList();

            int limit = pageable.getPageSize();
            if (limit <= 0 || candidates.size() <= limit) {
                return candidates;
            }
            return new ArrayList<>(candidates.subList(0, limit));
        });

        WorkRequest workRequest = workRequest(11L, 201L, "WR-015", "개발중");
        when(workRequestRepository.findByRequestNo("WR-015")).thenReturn(Optional.of(workRequest));
        when(gitHubRepoTeamMappingRepository.findByRepositoryFullNameAndActiveTrue("acme/repo"))
                .thenReturn(Optional.of(mapping(201L, "acme/repo")));

        doThrow(new RuntimeException("temporary failure"))
                .doNothing()
                .when(workRequestService)
                .updateStatus(eq(11L), any(WorkRequestStatusUpdateRequest.class));

        String payload = """
                {
                  "action":"closed",
                  "repository":{"full_name":"acme/repo"},
                  "pull_request":{
                    "number":77,
                    "merged":true,
                    "title":"로그인 버그 수정",
                    "body":"closes WR-015"
                  }
                }
                """;

        gitHubWebhookService.handleEvent("delivery-retry", "pull_request", payload);

        GitHubWebhookDelivery failed = deliveryStore.get("delivery-retry");
        assertThat(failed.getStatus()).isEqualTo(GitHubWebhookDeliveryStatus.FAILED);
        assertThat(failed.getAttemptCount()).isEqualTo(1);
        assertThat(failed.getNextRetryAt()).isNotNull();

        failed.setNextRetryAt(LocalDateTime.now().minusSeconds(1));
        gitHubWebhookService.retryFailedDeliveries();

        GitHubWebhookDelivery success = deliveryStore.get("delivery-retry");
        assertThat(success.getStatus()).isEqualTo(GitHubWebhookDeliveryStatus.SUCCESS);
        assertThat(success.getAttemptCount()).isEqualTo(2);
        verify(workRequestService, times(2)).updateStatus(eq(11L), any(WorkRequestStatusUpdateRequest.class));
    }

    @Test
    @DisplayName("키워드 없는 문서번호는 merged 이벤트에서 상태 전환하지 않는다")
    void doesNotCompleteWithoutKeyword() {
        when(gitHubRepoTeamMappingRepository.findByRepositoryFullNameAndActiveTrue("acme/repo"))
                .thenReturn(Optional.of(mapping(201L, "acme/repo")));

        String payload = """
                {
                  "action":"closed",
                  "repository":{"full_name":"acme/repo"},
                  "pull_request":{
                    "merged":true,
                    "title":"관련 문서 공유",
                    "body":"참고: TK-001"
                  }
                }
                """;

        gitHubWebhookService.handleEvent("delivery-no-keyword", "pull_request", payload);

        verify(workRequestService, never()).updateStatus(any(), any());
        verify(defectService, never()).updateStatus(any(), any());
        verify(techTaskService, never()).updateStatus(any(), any());
        verify(deploymentService, never()).updateStatus(any(), any());
    }

    private WorkRequest workRequest(Long id, Long teamId, String no, String status) {
        WorkRequest entity = new WorkRequest();
        entity.setId(id);
        entity.setTeamId(teamId);
        entity.setRequestNo(no);
        entity.setStatus(status);
        return entity;
    }

    private TechTask techTask(Long id, Long teamId, String no, String status) {
        TechTask entity = new TechTask();
        entity.setId(id);
        entity.setTeamId(teamId);
        entity.setTaskNo(no);
        entity.setStatus(status);
        return entity;
    }

    private Defect defect(Long id, Long teamId, String no, String status) {
        Defect entity = new Defect();
        entity.setId(id);
        entity.setTeamId(teamId);
        entity.setDefectNo(no);
        entity.setStatus(status);
        return entity;
    }

    private GitHubRepoTeamMapping mapping(Long teamId, String repository) {
        GitHubRepoTeamMapping mapping = new GitHubRepoTeamMapping();
        mapping.setTeamId(teamId);
        mapping.setRepositoryFullName(repository);
        mapping.setActive(true);
        return mapping;
    }
}
