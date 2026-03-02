package org.example.domain.deployment.service;

import org.example.domain.defect.repository.DefectRepository;
import org.example.domain.deployment.dto.DeploymentCreateRequest;
import org.example.domain.deployment.dto.DeploymentDetailResponse;
import org.example.domain.deployment.dto.DeploymentListQuery;
import org.example.domain.deployment.dto.DeploymentListResponse;
import org.example.domain.deployment.dto.DeploymentStatusUpdateRequest;
import org.example.domain.deployment.dto.DeploymentStepUpdateRequest;
import org.example.domain.deployment.dto.DeploymentUpdateRequest;
import org.example.domain.deployment.entity.Deployment;
import org.example.domain.deployment.entity.DeploymentStep;
import org.example.domain.deployment.repository.DeploymentRelatedRefRepository;
import org.example.domain.deployment.repository.DeploymentRepository;
import org.example.domain.deployment.repository.DeploymentStepRepository;
import org.example.domain.documentIndex.service.DocumentIndexSyncService;
import org.example.domain.notification.service.NotificationEventService;
import org.example.domain.techTask.repository.TechTaskRepository;
import org.example.domain.testScenario.repository.TestScenarioRepository;
import org.example.domain.workRequest.repository.WorkRequestRepository;
import org.example.global.team.TeamRequestContext;
import org.example.global.util.DocumentNoGenerator;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DeploymentServiceImplTest {

    @Mock private DeploymentRepository deploymentRepository;
    @Mock private DeploymentRelatedRefRepository deploymentRelatedRefRepository;
    @Mock private DeploymentStepRepository deploymentStepRepository;
    @Mock private WorkRequestRepository workRequestRepository;
    @Mock private TechTaskRepository techTaskRepository;
    @Mock private TestScenarioRepository testScenarioRepository;
    @Mock private DefectRepository defectRepository;
    @Mock private DocumentNoGenerator documentNoGenerator;
    @Mock private NotificationEventService notificationEventService;
    @Mock private DocumentIndexSyncService documentIndexSyncService;

    @InjectMocks
    private DeploymentServiceImpl deploymentService;

    @Captor
    private ArgumentCaptor<Deployment> deploymentCaptor;

    @Captor
    private ArgumentCaptor<Pageable> pageableCaptor;

    @BeforeEach
    void setUpTeamContext() {
        TeamRequestContext.set(1L, 10L);
    }

    @AfterEach
    void clearTeamContext() {
        TeamRequestContext.clear();
    }

    @Test
    @DisplayName("목록 조회 시 페이징/정렬을 적용하고 리스트 응답으로 매핑한다")
    void findPage() {
        Deployment entity = sampleEntity(1L);
        when(deploymentRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(entity)));

        Page<DeploymentListResponse> page = deploymentService.findPage(0, 20, new DeploymentListQuery(
                null, null, null, null, null, null, null, "id", "desc"
        ));

        verify(deploymentRepository).findAll(any(Specification.class), pageableCaptor.capture());
        Pageable pageable = pageableCaptor.getValue();
        Sort.Order idOrder = pageable.getSort().getOrderFor("id");

        assertThat(pageable.getPageNumber()).isEqualTo(0);
        assertThat(pageable.getPageSize()).isEqualTo(20);
        assertThat(idOrder).isNotNull();
        assertThat(idOrder.getDirection()).isEqualTo(Sort.Direction.DESC);
        assertThat(page.getContent()).hasSize(1);
        assertThat(page.getContent().get(0).id()).isEqualTo(1L);
    }

    @Test
    @DisplayName("상세 조회 성공 시 엔티티를 상세 응답으로 반환한다")
    void findById() {
        Deployment entity = sampleEntity(3L);
        when(deploymentRepository.findById(3L)).thenReturn(Optional.of(entity));

        DeploymentDetailResponse response = deploymentService.findById(3L);

        assertThat(response.id()).isEqualTo(3L);
        assertThat(response.deployNo()).isEqualTo("DP-001");
        assertThat(response.title()).isEqualTo("2월 정기 배포");
    }

    @Test
    @DisplayName("상세 조회 대상이 없으면 404 예외를 던진다")
    void findByIdNotFound() {
        when(deploymentRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> deploymentService.findById(999L))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("배포를 찾을 수 없습니다.");
    }

    @Test
    @DisplayName("생성 시 기본값(type/environment/status)과 번호를 세팅한다")
    void create() {
        DeploymentCreateRequest request = new DeploymentCreateRequest(
                "2월 정기 배포",
                null,   // overview
                null,   // rollbackPlan
                "v2.3.0",
                null,   // type → 정기배포
                null,   // environment → 개발
                null,   // status → 대기
                2L,
                LocalDate.of(2026, 2, 28),
                null, null, null, null, null, null,
                null, null
        );

        when(deploymentRepository.save(any(Deployment.class))).thenAnswer(invocation -> {
            Deployment d = invocation.getArgument(0);
            d.setId(50L);
            return d;
        });
        when(documentNoGenerator.next("DP")).thenReturn("DP-001");

        Long createdId = deploymentService.create(request);

        verify(deploymentRepository).save(deploymentCaptor.capture());
        Deployment saved = deploymentCaptor.getValue();

        assertThat(createdId).isEqualTo(50L);
        assertThat(saved.getDeployNo()).isEqualTo("DP-001");
        assertThat(saved.getType()).isEqualTo("정기배포");
        assertThat(saved.getEnvironment()).isEqualTo("개발");
        assertThat(saved.getStatus()).isEqualTo("대기");
        assertThat(saved.getTeamId()).isEqualTo(10L);
    }

    @Test
    @DisplayName("생성 시 title이 없으면 400 예외를 던진다")
    void createWithBlankTitle() {
        DeploymentCreateRequest request = new DeploymentCreateRequest(
                "", null, null, "v2.3.0", null, null, null,
                2L, LocalDate.of(2026, 2, 28),
                null, null, null, null, null, null, null, null
        );

        assertThatThrownBy(() -> deploymentService.create(request))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("title은 필수입니다.");
    }

    @Test
    @DisplayName("생성 시 잘못된 type이면 400 예외를 던진다")
    void createWithInvalidType() {
        DeploymentCreateRequest request = new DeploymentCreateRequest(
                "배포", null, null, "v1.0", "잘못된타입", null, null,
                2L, LocalDate.of(2026, 2, 28),
                null, null, null, null, null, null, null, null
        );

        assertThatThrownBy(() -> deploymentService.create(request))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("유효하지 않은 type");
    }

    @Test
    @DisplayName("생성 시 잘못된 environment이면 400 예외를 던진다")
    void createWithInvalidEnvironment() {
        DeploymentCreateRequest request = new DeploymentCreateRequest(
                "배포", null, null, "v1.0", null, "잘못된환경", null,
                2L, LocalDate.of(2026, 2, 28),
                null, null, null, null, null, null, null, null
        );

        assertThatThrownBy(() -> deploymentService.create(request))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("유효하지 않은 environment");
    }

    @Test
    @DisplayName("수정 시 null이 아닌 필드만 반영한다")
    void update() {
        Deployment entity = sampleEntity(7L);
        when(deploymentRepository.findById(7L)).thenReturn(Optional.of(entity));

        DeploymentUpdateRequest request = new DeploymentUpdateRequest(
                "수정 제목", null, null, "v2.4.0", "핫픽스", "스테이징", "진행중",
                null, LocalDate.of(2026, 3, 1), null, null, null, null, null, null,
                null, null
        );

        deploymentService.update(7L, request);

        assertThat(entity.getTitle()).isEqualTo("수정 제목");
        assertThat(entity.getVersion()).isEqualTo("v2.4.0");
        assertThat(entity.getType()).isEqualTo("핫픽스");
        assertThat(entity.getEnvironment()).isEqualTo("스테이징");
        assertThat(entity.getStatus()).isEqualTo("진행중");
        // 변경하지 않은 필드 유지
        assertThat(entity.getManagerId()).isEqualTo(2L);
    }

    @Test
    @DisplayName("상태 변경 시 완료 알림을 발행한다")
    void updateStatusPublishesCompletedNotification() {
        Deployment entity = sampleEntity(7L);
        when(deploymentRepository.findById(7L)).thenReturn(Optional.of(entity));

        deploymentService.updateStatus(7L, new DeploymentStatusUpdateRequest("완료", null));

        assertThat(entity.getStatus()).isEqualTo("완료");
        verify(notificationEventService).create(
                eq(2L),
                eq("배포완료"),
                eq("배포 완료"),
                contains("완료"),
                eq("DEPLOYMENT"),
                eq(7L)
        );
    }

    @Test
    @DisplayName("상태 변경 시 status가 없으면 400 예외를 던진다")
    void updateStatusWithBlankStatus() {
        assertThatThrownBy(() -> deploymentService.updateStatus(1L, new DeploymentStatusUpdateRequest("", null)))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("status는 필수입니다.");
    }

    @Test
    @DisplayName("절차 완료 처리 시 isDone=true이면 completedAt을 기록한다")
    void updateStepDone() {
        Deployment entity = sampleEntity(7L);
        when(deploymentRepository.findById(7L)).thenReturn(Optional.of(entity));

        DeploymentStep step = new DeploymentStep();
        step.setId(10L);
        step.setDeploymentId(7L);
        step.setStepOrder(1);
        step.setContent("빌드");
        step.setIsDone(false);
        when(deploymentStepRepository.findByIdAndDeploymentId(10L, 7L)).thenReturn(Optional.of(step));

        deploymentService.updateStep(7L, 10L, new DeploymentStepUpdateRequest(true));

        assertThat(step.getIsDone()).isTrue();
        assertThat(step.getCompletedAt()).isNotNull();
    }

    @Test
    @DisplayName("절차 완료 취소 시 isDone=false이면 completedAt을 초기화한다")
    void updateStepUndone() {
        Deployment entity = sampleEntity(7L);
        when(deploymentRepository.findById(7L)).thenReturn(Optional.of(entity));

        DeploymentStep step = new DeploymentStep();
        step.setId(10L);
        step.setDeploymentId(7L);
        step.setStepOrder(1);
        step.setContent("빌드");
        step.setIsDone(true);
        step.setCompletedAt(LocalDateTime.now());
        when(deploymentStepRepository.findByIdAndDeploymentId(10L, 7L)).thenReturn(Optional.of(step));

        deploymentService.updateStep(7L, 10L, new DeploymentStepUpdateRequest(false));

        assertThat(step.getIsDone()).isFalse();
        assertThat(step.getCompletedAt()).isNull();
    }

    private Deployment sampleEntity(Long id) {
        Deployment entity = new Deployment();
        entity.setId(id);
        entity.setDeployNo("DP-001");
        entity.setTitle("2월 정기 배포");
        entity.setVersion("v2.3.0");
        entity.setType("정기배포");
        entity.setEnvironment("운영");
        entity.setStatus("대기");
        entity.setTeamId(10L);
        entity.setManagerId(2L);
        entity.setScheduledAt(LocalDate.of(2026, 2, 28));
        entity.setCreatedAt(LocalDateTime.of(2026, 2, 1, 9, 0));
        entity.setUpdatedAt(LocalDateTime.of(2026, 2, 2, 9, 0));
        return entity;
    }
}
