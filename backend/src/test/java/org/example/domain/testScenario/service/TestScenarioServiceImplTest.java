package org.example.domain.testScenario.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.domain.documentIndex.service.DocumentIndexSyncService;
import org.example.domain.notification.service.NotificationEventService;
import org.example.domain.testScenario.dto.TestScenarioCreateRequest;
import org.example.domain.testScenario.dto.TestScenarioDetailResponse;
import org.example.domain.testScenario.dto.TestScenarioExecutionUpdateRequest;
import org.example.domain.testScenario.dto.TestScenarioListQuery;
import org.example.domain.testScenario.dto.TestScenarioListResponse;
import org.example.domain.testScenario.dto.TestScenarioStatusUpdateRequest;
import org.example.domain.testScenario.dto.TestScenarioUpdateRequest;
import org.example.domain.testScenario.entity.TestScenario;
import org.example.domain.testScenario.repository.TestScenarioRelatedRefRepository;
import org.example.domain.testScenario.repository.TestScenarioRepository;
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
import org.mockito.Spy;
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
class TestScenarioServiceImplTest {

    @Mock private TestScenarioRepository testScenarioRepository;
    @Mock private TestScenarioRelatedRefRepository testScenarioRelatedRefRepository;
    @Mock private DocumentNoGenerator documentNoGenerator;
    @Mock private NotificationEventService notificationEventService;
    @Mock private DocumentIndexSyncService documentIndexSyncService;

    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private TestScenarioServiceImpl testScenarioService;

    @Captor
    private ArgumentCaptor<TestScenario> scenarioCaptor;

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
        TestScenario entity = sampleEntity(1L);
        when(testScenarioRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(entity)));

        Page<TestScenarioListResponse> page = testScenarioService.findPage(0, 20, new TestScenarioListQuery(
                null, null, null, null, null, null, null, "id", "desc"
        ));

        verify(testScenarioRepository).findAll(any(Specification.class), pageableCaptor.capture());
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
        TestScenario entity = sampleEntity(3L);
        when(testScenarioRepository.findById(3L)).thenReturn(Optional.of(entity));

        TestScenarioDetailResponse response = testScenarioService.findById(3L);

        assertThat(response.id()).isEqualTo(3L);
        assertThat(response.scenarioNo()).isEqualTo("TS-001");
        assertThat(response.title()).isEqualTo("로그인 시나리오");
    }

    @Test
    @DisplayName("상세 조회 대상이 없으면 404 예외를 던진다")
    void findByIdNotFound() {
        when(testScenarioRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> testScenarioService.findById(999L))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("테스트 시나리오를 찾을 수 없습니다.");
    }

    @Test
    @DisplayName("생성 시 기본값(type/priority/status)과 번호를 세팅한다")
    void create() {
        TestScenarioCreateRequest request = new TestScenarioCreateRequest(
                "로그인 시나리오",
                "설명",
                "",    // type → 기능
                " ",   // priority → 보통
                null,  // status → 작성중
                30L,
                null, null, null, null,
                LocalDate.of(2026, 3, 7),
                null, null,
                10L    // createdBy
        );

        when(testScenarioRepository.save(any(TestScenario.class))).thenAnswer(invocation -> {
            TestScenario ts = invocation.getArgument(0);
            ts.setId(10L);
            return ts;
        });
        when(documentNoGenerator.next("TS")).thenReturn("TS-001");

        Long createdId = testScenarioService.create(request);

        verify(testScenarioRepository).save(scenarioCaptor.capture());
        TestScenario saved = scenarioCaptor.getValue();

        assertThat(createdId).isEqualTo(10L);
        assertThat(saved.getScenarioNo()).isEqualTo("TS-001");
        assertThat(saved.getType()).isEqualTo("기능");
        assertThat(saved.getPriority()).isEqualTo("보통");
        assertThat(saved.getStatus()).isEqualTo("작성중");
        assertThat(saved.getTeamId()).isEqualTo(10L);
        assertThat(saved.getSteps()).isEqualTo("[]");
    }

    @Test
    @DisplayName("생성 시 title이 없으면 400 예외를 던진다")
    void createWithBlankTitle() {
        TestScenarioCreateRequest request = new TestScenarioCreateRequest(
                "", "설명", null, null, null,
                30L, null, null, null, null,
                LocalDate.of(2026, 3, 7), null, null, 10L
        );

        assertThatThrownBy(() -> testScenarioService.create(request))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("title은 필수입니다.");
    }

    @Test
    @DisplayName("생성 시 createdBy가 없으면 400 예외를 던진다")
    void createWithNullCreatedBy() {
        TestScenarioCreateRequest request = new TestScenarioCreateRequest(
                "시나리오", "설명", null, null, null,
                null, null, null, null, null,
                LocalDate.of(2026, 3, 7), null, null, null
        );

        assertThatThrownBy(() -> testScenarioService.create(request))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("createdBy는 필수입니다.");
    }

    @Test
    @DisplayName("수정 시 null이 아닌 필드만 반영한다")
    void update() {
        TestScenario entity = sampleEntity(7L);
        when(testScenarioRepository.findById(7L)).thenReturn(Optional.of(entity));

        TestScenarioUpdateRequest request = new TestScenarioUpdateRequest(
                "수정 제목", null, "회귀", "높음", "검토완료",
                null, null, null, null, null, null, null, null
        );

        testScenarioService.update(7L, request);

        assertThat(entity.getTitle()).isEqualTo("수정 제목");
        assertThat(entity.getType()).isEqualTo("회귀");
        assertThat(entity.getPriority()).isEqualTo("높음");
        assertThat(entity.getStatus()).isEqualTo("검토완료");
        // 변경하지 않은 필드 유지
        assertThat(entity.getDescription()).isEqualTo("시나리오 설명");
    }

    @Test
    @DisplayName("수정 시 상태가 변경되면 생성자에게 알림을 발행한다")
    void updatePublishesStatusNotification() {
        TestScenario entity = sampleEntity(7L);
        when(testScenarioRepository.findById(7L)).thenReturn(Optional.of(entity));

        TestScenarioUpdateRequest request = new TestScenarioUpdateRequest(
                null, null, null, null, "완료",
                null, null, null, null, null, null, null, null
        );

        testScenarioService.update(7L, request);

        verify(notificationEventService).create(
                eq(30L),   // createdBy
                eq("상태변경"),
                eq("테스트 시나리오 상태 변경"),
                contains("완료"),
                eq("TEST_SCENARIO"),
                eq(7L)
        );
    }

    @Test
    @DisplayName("상태 전용 변경은 상태와 메모를 반영한다")
    void updateStatus() {
        TestScenario entity = sampleEntity(9L);
        when(testScenarioRepository.findById(9L)).thenReturn(Optional.of(entity));

        testScenarioService.updateStatus(9L, new TestScenarioStatusUpdateRequest("완료", "QA 통과"));

        assertThat(entity.getStatus()).isEqualTo("완료");
        assertThat(entity.getStatusNote()).isEqualTo("QA 통과");
    }

    @Test
    @DisplayName("상태 변경 시 status가 없으면 400 예외를 던진다")
    void updateStatusWithBlankStatus() {
        assertThatThrownBy(() -> testScenarioService.updateStatus(1L, new TestScenarioStatusUpdateRequest("", null)))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("status는 필수입니다.");
    }

    @Test
    @DisplayName("실행 결과 업데이트 시 PASS/FAIL/SKIP을 steps에 반영한다")
    void updateExecution() {
        TestScenario entity = sampleEntity(5L);
        entity.setSteps("[{\"action\":\"버튼 클릭\",\"expected\":\"화면 이동\"}]");
        when(testScenarioRepository.findById(5L)).thenReturn(Optional.of(entity));

        testScenarioService.updateExecution(5L, new TestScenarioExecutionUpdateRequest(
                List.of("PASS"),
                "정상 동작 확인",
                LocalDateTime.of(2026, 3, 1, 14, 0)
        ));

        assertThat(entity.getActualResult()).isEqualTo("정상 동작 확인");
        assertThat(entity.getExecutedAt()).isEqualTo(LocalDateTime.of(2026, 3, 1, 14, 0));
        assertThat(entity.getSteps()).contains("pass");
    }

    @Test
    @DisplayName("실행 결과 업데이트 시 steps 개수가 다르면 400 예외를 던진다")
    void updateExecutionWithStepCountMismatch() {
        TestScenario entity = sampleEntity(5L);
        entity.setSteps("[{\"action\":\"step1\"},{\"action\":\"step2\"}]");
        when(testScenarioRepository.findById(5L)).thenReturn(Optional.of(entity));

        assertThatThrownBy(() -> testScenarioService.updateExecution(5L, new TestScenarioExecutionUpdateRequest(
                List.of("PASS"),   // steps가 2개인데 결과는 1개
                null, null
        )))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("stepResults 개수와 steps 개수가 일치하지 않습니다.");
    }

    @Test
    @DisplayName("실행 결과 업데이트 시 유효하지 않은 결과값이면 400 예외를 던진다")
    void updateExecutionWithInvalidResult() {
        TestScenario entity = sampleEntity(5L);
        entity.setSteps("[{\"action\":\"step1\"}]");
        when(testScenarioRepository.findById(5L)).thenReturn(Optional.of(entity));

        assertThatThrownBy(() -> testScenarioService.updateExecution(5L, new TestScenarioExecutionUpdateRequest(
                List.of("INVALID"),
                null, null
        )))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("PASS, FAIL, SKIP");
    }

    private TestScenario sampleEntity(Long id) {
        TestScenario entity = new TestScenario();
        entity.setId(id);
        entity.setScenarioNo("TS-001");
        entity.setTitle("로그인 시나리오");
        entity.setDescription("시나리오 설명");
        entity.setType("기능");
        entity.setPriority("보통");
        entity.setStatus("작성중");
        entity.setTeamId(10L);
        entity.setCreatedBy(30L);
        entity.setSteps("[]");
        entity.setDeadline(LocalDate.of(2026, 3, 7));
        entity.setCreatedAt(LocalDateTime.of(2026, 2, 1, 9, 0));
        entity.setUpdatedAt(LocalDateTime.of(2026, 2, 2, 9, 0));
        return entity;
    }
}
