package org.example.domain.techTask.service;

import jakarta.persistence.EntityNotFoundException;
import org.example.domain.notification.service.NotificationEventService;
import org.example.domain.techTask.dto.TechTaskCreateRequest;
import org.example.domain.techTask.dto.TechTaskDetailResponse;
import org.example.domain.techTask.dto.TechTaskListQuery;
import org.example.domain.techTask.dto.TechTaskListResponse;
import org.example.domain.techTask.dto.TechTaskPrLinkCreateRequest;
import org.example.domain.techTask.dto.TechTaskPrLinkResponse;
import org.example.domain.techTask.dto.TechTaskRelatedRefItemRequest;
import org.example.domain.techTask.dto.TechTaskRelatedRefsUpdateRequest;
import org.example.domain.techTask.dto.TechTaskRelatedRefResponse;
import org.example.domain.techTask.dto.TechTaskStatusUpdateRequest;
import org.example.domain.techTask.dto.TechTaskUpdateRequest;
import org.example.domain.techTask.entity.TechTask;
import org.example.domain.techTask.entity.TechTaskPrLink;
import org.example.domain.techTask.entity.TechTaskRelatedRef;
import org.example.domain.techTask.repository.TechTaskPrLinkRepository;
import org.example.domain.techTask.repository.TechTaskRelatedRefRepository;
import org.example.domain.techTask.repository.TechTaskRepository;
import org.example.domain.workRequest.entity.WorkRequest;
import org.example.domain.workRequest.repository.WorkRequestRepository;
import org.example.global.util.DocumentNoGenerator;
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
import org.springframework.http.HttpStatus;
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
class TechTaskServiceImplTest {

    @Mock
    private TechTaskRepository techTaskRepository;

    @Mock
    private TechTaskRelatedRefRepository techTaskRelatedRefRepository;

    @Mock
    private TechTaskPrLinkRepository techTaskPrLinkRepository;

    @Mock
    private WorkRequestRepository workRequestRepository;

    @Mock
    private DocumentNoGenerator documentNoGenerator;

    @Mock
    private NotificationEventService notificationEventService;

    @InjectMocks
    private TechTaskServiceImpl techTaskService;

    @Captor
    private ArgumentCaptor<Pageable> pageableCaptor;

    @Captor
    private ArgumentCaptor<TechTask> techTaskCaptor;

    @Captor
    private ArgumentCaptor<List<TechTaskRelatedRef>> relatedRefRowsCaptor;

    @Test
    @DisplayName("목록 조회 시 페이징/정렬을 적용하고 리스트 응답으로 매핑한다")
    void findPage() {
        TechTask entity = sampleEntity(1L);
        when(techTaskRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(entity)));

        Page<TechTaskListResponse> page = techTaskService.findPage(1, 10, new TechTaskListQuery(
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                "id",
                "desc"
        ));

        verify(techTaskRepository).findAll(any(Specification.class), pageableCaptor.capture());
        Pageable pageable = pageableCaptor.getValue();
        Sort.Order idOrder = pageable.getSort().getOrderFor("id");

        assertThat(pageable.getPageNumber()).isEqualTo(1);
        assertThat(pageable.getPageSize()).isEqualTo(10);
        assertThat(idOrder).isNotNull();
        assertThat(idOrder.getDirection()).isEqualTo(Sort.Direction.DESC);

        assertThat(page.getContent()).hasSize(1);
        assertThat(page.getContent().get(0).taskNo()).isEqualTo("TK-001");
    }

    @Test
    @DisplayName("상세 조회 성공 시 엔티티를 상세 응답으로 반환한다")
    void findById() {
        TechTask entity = sampleEntity(3L);
        when(techTaskRepository.findById(3L)).thenReturn(Optional.of(entity));

        TechTaskDetailResponse response = techTaskService.findById(3L);

        assertThat(response.id()).isEqualTo(3L);
        assertThat(response.taskNo()).isEqualTo("TK-001");
        assertThat(response.currentIssue()).isEqualTo("문제 현황");
        assertThat(response.solution()).isEqualTo("개선 방안");
        assertThat(response.registrantId()).isEqualTo(20L);
    }

    @Test
    @DisplayName("상세 조회 대상이 없으면 예외를 던진다")
    void findByIdNotFound() {
        when(techTaskRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> techTaskService.findById(999L))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessageContaining("TechTask not found");
    }

    @Test
    @DisplayName("생성 시 기본값(type/priority/status)과 문서번호를 세팅한다")
    void create() {
        TechTaskCreateRequest request = new TechTaskCreateRequest(
                "서비스 레이어 분리",
                "컨트롤러가 저장소를 직접 호출",
                "서비스 계층으로 이동",
                "[\"테스트 작성\"]",
                "",
                " ",
                null,
                10L,
                20L,
                null,
                LocalDate.of(2026, 3, 7)
        );

        when(techTaskRepository.save(any(TechTask.class))).thenAnswer(invocation -> {
            TechTask task = invocation.getArgument(0);
            task.setId(100L);
            return task;
        });
        when(documentNoGenerator.next("TK")).thenReturn("TK-001");

        Long createdId = techTaskService.create(request);

        verify(techTaskRepository).save(techTaskCaptor.capture());
        TechTask saved = techTaskCaptor.getValue();

        assertThat(createdId).isEqualTo(100L);
        assertThat(saved.getTaskNo()).isEqualTo("TK-001");
        assertThat(saved.getType()).isEqualTo("기타");
        assertThat(saved.getPriority()).isEqualTo("보통");
        assertThat(saved.getStatus()).isEqualTo("접수대기");
        assertThat(saved.getTeamId()).isEqualTo(10L);
        assertThat(saved.getRegistrantId()).isEqualTo(20L);
    }

    @Test
    @DisplayName("수정 시 null이 아닌 필드만 반영한다")
    void update() {
        TechTask entity = sampleEntity(7L);
        when(techTaskRepository.findById(7L)).thenReturn(Optional.of(entity));

        TechTaskUpdateRequest request = new TechTaskUpdateRequest(
                "수정 제목",
                null,
                "수정 개선 방안",
                null,
                null,
                "긴급",
                "개발중",
                null,
                LocalDate.of(2026, 3, 10),
                LocalDateTime.of(2026, 2, 25, 9, 0),
                null,
                null,
                null
        );

        techTaskService.update(7L, request);

        assertThat(entity.getTitle()).isEqualTo("수정 제목");
        assertThat(entity.getSolution()).isEqualTo("수정 개선 방안");
        assertThat(entity.getPriority()).isEqualTo("긴급");
        assertThat(entity.getStatus()).isEqualTo("개발중");
        assertThat(entity.getDeadline()).isEqualTo(LocalDate.of(2026, 3, 10));
        assertThat(entity.getStartedAt()).isEqualTo(LocalDateTime.of(2026, 2, 25, 9, 0));
        assertThat(entity.getCurrentIssue()).isEqualTo("문제 현황");
    }

    @Test
    @DisplayName("상태 변경 시 status를 업데이트한다")
    void updateStatus() {
        TechTask entity = sampleEntity(7L);
        when(techTaskRepository.findById(7L)).thenReturn(Optional.of(entity));

        techTaskService.updateStatus(7L, new TechTaskStatusUpdateRequest("완료", "done"));

        assertThat(entity.getStatus()).isEqualTo("완료");
    }

    @Test
    @DisplayName("생성 시 담당자가 있으면 담당자배정 알림을 발행한다")
    void createPublishesAssignNotification() {
        TechTaskCreateRequest request = new TechTaskCreateRequest(
                "서비스 레이어 분리",
                "컨트롤러가 저장소를 직접 호출",
                "서비스 계층으로 이동",
                "[\"테스트 작성\"]",
                "리팩토링",
                "높음",
                "검토중",
                10L,
                20L,
                30L,
                LocalDate.of(2026, 3, 7)
        );

        when(techTaskRepository.save(any(TechTask.class))).thenAnswer(invocation -> {
            TechTask task = invocation.getArgument(0);
            task.setId(100L);
            return task;
        });
        when(documentNoGenerator.next("TK")).thenReturn("TK-001");

        techTaskService.create(request);

        verify(notificationEventService).create(
                eq(30L),
                eq("담당자배정"),
                eq("기술과제 배정"),
                contains("TK-001"),
                eq("TECH_TASK"),
                eq(100L)
        );
    }

    @Test
    @DisplayName("상태 변경 시 등록자에게 상태변경 알림을 발행한다")
    void updateStatusPublishesNotification() {
        TechTask entity = sampleEntity(7L);
        when(techTaskRepository.findById(7L)).thenReturn(Optional.of(entity));

        techTaskService.updateStatus(7L, new TechTaskStatusUpdateRequest("완료", "done"));

        verify(notificationEventService).create(
                eq(20L),
                eq("상태변경"),
                eq("기술과제 상태 변경"),
                contains("완료"),
                eq("TECH_TASK"),
                eq(7L)
        );
    }

    @Test
    @DisplayName("상태 변경 시 status가 비어 있으면 400")
    void updateStatusBadRequest() {
        assertThatThrownBy(() -> techTaskService.updateStatus(7L, new TechTaskStatusUpdateRequest(" ", null)))
                .isInstanceOfSatisfying(ResponseStatusException.class, ex ->
                        assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST)
                );
    }

    @Test
    @DisplayName("연관 문서 조회 시 참조 메타데이터를 함께 반환한다")
    void getRelatedRefs() {
        when(techTaskRepository.existsById(1L)).thenReturn(true);
        when(techTaskRelatedRefRepository.findByTechTaskIdOrderByIdAsc(1L)).thenReturn(List.of(
                relatedRef(1L, "WORK_REQUEST", 11L),
                relatedRef(2L, "TECH_TASK", 12L),
                relatedRef(3L, "DEFECT", 13L)
        ));

        WorkRequest workRequest = new WorkRequest();
        workRequest.setId(11L);
        workRequest.setRequestNo("WR-011");
        workRequest.setTitle("로그인 버그 수정");
        when(workRequestRepository.findById(11L)).thenReturn(Optional.of(workRequest));

        TechTask referencedTask = sampleEntity(12L);
        referencedTask.setTaskNo("TK-012");
        referencedTask.setTitle("공통 에러 핸들러 모듈화");
        when(techTaskRepository.findById(12L)).thenReturn(Optional.of(referencedTask));

        List<TechTaskRelatedRefResponse> result = techTaskService.getRelatedRefs(1L);

        assertThat(result).hasSize(3);
        assertThat(result.get(0).refNo()).isEqualTo("WR-011");
        assertThat(result.get(0).title()).isEqualTo("로그인 버그 수정");
        assertThat(result.get(1).refNo()).isEqualTo("TK-012");
        assertThat(result.get(1).title()).isEqualTo("공통 에러 핸들러 모듈화");
        assertThat(result.get(2).refNo()).isEqualTo("DF-13");
    }

    @Test
    @DisplayName("연관 문서 교체 시 중복 제거 후 저장한다")
    void replaceRelatedRefs() {
        when(techTaskRepository.existsById(1L)).thenReturn(true);

        TechTaskRelatedRefsUpdateRequest request = new TechTaskRelatedRefsUpdateRequest(List.of(
                new TechTaskRelatedRefItemRequest("tech_task", 12L, 2),
                new TechTaskRelatedRefItemRequest("work_request", 11L, 1),
                new TechTaskRelatedRefItemRequest("TECH_TASK", 12L, 3)
        ));

        techTaskService.replaceRelatedRefs(1L, request);

        verify(techTaskRelatedRefRepository).deleteByTechTaskId(1L);
        verify(techTaskRelatedRefRepository).saveAll(relatedRefRowsCaptor.capture());

        List<TechTaskRelatedRef> rows = relatedRefRowsCaptor.getValue();
        assertThat(rows).hasSize(2);
        assertThat(rows.get(0).getRefType()).isEqualTo("WORK_REQUEST");
        assertThat(rows.get(0).getRefId()).isEqualTo(11L);
        assertThat(rows.get(1).getRefType()).isEqualTo("TECH_TASK");
        assertThat(rows.get(1).getRefId()).isEqualTo(12L);
    }

    @Test
    @DisplayName("PR 링크 조회 성공")
    void getPrLinks() {
        when(techTaskRepository.existsById(1L)).thenReturn(true);
        when(techTaskPrLinkRepository.findByTechTaskIdOrderByIdAsc(1L)).thenReturn(List.of(
                prLink(1L, 1L, "feature/login", "42", "https://example.com/pr/42")
        ));

        List<TechTaskPrLinkResponse> result = techTaskService.getPrLinks(1L);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).id()).isEqualTo(1L);
        assertThat(result.get(0).branchName()).isEqualTo("feature/login");
    }

    @Test
    @DisplayName("PR 링크 생성 성공")
    void createPrLink() {
        when(techTaskRepository.existsById(1L)).thenReturn(true);
        when(techTaskPrLinkRepository.save(any(TechTaskPrLink.class))).thenAnswer(invocation -> {
            TechTaskPrLink row = invocation.getArgument(0);
            row.setId(10L);
            return row;
        });

        Long createdId = techTaskService.createPrLink(1L, new TechTaskPrLinkCreateRequest("feature/login", "42", "https://example.com/pr/42"));

        assertThat(createdId).isEqualTo(10L);
    }

    @Test
    @DisplayName("PR 링크 삭제 성공")
    void deletePrLink() {
        when(techTaskRepository.existsById(1L)).thenReturn(true);
        when(techTaskPrLinkRepository.findByIdAndTechTaskId(10L, 1L))
                .thenReturn(Optional.of(prLink(10L, 1L, "feature/login", "42", "https://example.com/pr/42")));

        techTaskService.deletePrLink(1L, 10L);

        verify(techTaskPrLinkRepository).delete(any(TechTaskPrLink.class));
    }

    private TechTask sampleEntity(Long id) {
        TechTask entity = new TechTask();
        entity.setId(id);
        entity.setTaskNo("TK-001");
        entity.setTitle("기술과제 제목");
        entity.setCurrentIssue("문제 현황");
        entity.setSolution("개선 방안");
        entity.setDefinitionOfDone("[\"테스트 작성\"]");
        entity.setType("리팩토링");
        entity.setPriority("보통");
        entity.setStatus("검토중");
        entity.setTeamId(10L);
        entity.setRegistrantId(20L);
        entity.setAssigneeId(30L);
        entity.setDeadline(LocalDate.of(2026, 3, 7));
        entity.setCreatedAt(LocalDateTime.of(2026, 2, 1, 9, 0));
        entity.setUpdatedAt(LocalDateTime.of(2026, 2, 2, 9, 0));
        return entity;
    }

    private TechTaskRelatedRef relatedRef(Long id, String refType, Long refId) {
        TechTaskRelatedRef ref = new TechTaskRelatedRef();
        ref.setId(id);
        ref.setTechTaskId(1L);
        ref.setRefType(refType);
        ref.setRefId(refId);
        return ref;
    }

    private TechTaskPrLink prLink(Long id, Long techTaskId, String branchName, String prNo, String prUrl) {
        TechTaskPrLink link = new TechTaskPrLink();
        link.setId(id);
        link.setTechTaskId(techTaskId);
        link.setBranchName(branchName);
        link.setPrNo(prNo);
        link.setPrUrl(prUrl);
        return link;
    }
}
