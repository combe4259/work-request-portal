package org.example.domain.meetingNote.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.domain.meetingNote.dto.MeetingActionItemItemRequest;
import org.example.domain.meetingNote.dto.MeetingActionItemResponse;
import org.example.domain.meetingNote.dto.MeetingActionItemStatusUpdateRequest;
import org.example.domain.meetingNote.dto.MeetingNoteCreateRequest;
import org.example.domain.meetingNote.dto.MeetingNoteDetailResponse;
import org.example.domain.meetingNote.dto.MeetingNoteListResponse;
import org.example.domain.meetingNote.dto.MeetingNoteRelatedRefItemRequest;
import org.example.domain.meetingNote.dto.MeetingNoteRelatedRefResponse;
import org.example.domain.meetingNote.dto.MeetingNoteUpdateRequest;
import org.example.domain.meetingNote.entity.MeetingActionItem;
import org.example.domain.meetingNote.entity.MeetingAttendee;
import org.example.domain.meetingNote.entity.MeetingNote;
import org.example.domain.meetingNote.entity.MeetingNoteRelatedRef;
import org.example.domain.meetingNote.repository.MeetingActionItemRepository;
import org.example.domain.meetingNote.repository.MeetingAttendeeRepository;
import org.example.domain.meetingNote.repository.MeetingNoteRepository;
import org.example.domain.meetingNote.repository.MeetingNoteRelatedRefRepository;
import org.example.domain.workRequest.entity.WorkRequest;
import org.example.domain.workRequest.repository.WorkRequestRepository;
import org.example.domain.techTask.repository.TechTaskRepository;
import org.example.domain.testScenario.repository.TestScenarioRepository;
import org.example.domain.defect.repository.DefectRepository;
import org.example.domain.deployment.repository.DeploymentRepository;
import org.example.domain.knowledgeBase.repository.KnowledgeBaseArticleRepository;
import org.example.global.util.DocumentNoGenerator;
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
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MeetingNoteServiceImplTest {

    @Mock
    private MeetingNoteRepository meetingNoteRepository;

    @Mock
    private MeetingActionItemRepository meetingActionItemRepository;

    @Mock
    private MeetingAttendeeRepository meetingAttendeeRepository;

    @Mock
    private MeetingNoteRelatedRefRepository meetingNoteRelatedRefRepository;

    @Mock
    private WorkRequestRepository workRequestRepository;

    @Mock
    private TechTaskRepository techTaskRepository;

    @Mock
    private TestScenarioRepository testScenarioRepository;

    @Mock
    private DefectRepository defectRepository;

    @Mock
    private DeploymentRepository deploymentRepository;

    @Mock
    private KnowledgeBaseArticleRepository knowledgeBaseArticleRepository;

    @Mock
    private DocumentNoGenerator documentNoGenerator;

    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private MeetingNoteServiceImpl meetingNoteService;

    @Captor
    private ArgumentCaptor<Pageable> pageableCaptor;

    @Captor
    private ArgumentCaptor<MeetingNote> meetingNoteCaptor;

    @Captor
    private ArgumentCaptor<List<MeetingActionItem>> actionItemRowsCaptor;

    @Captor
    private ArgumentCaptor<List<MeetingNoteRelatedRef>> relatedRefRowsCaptor;

    @Test
    @DisplayName("목록 조회 시 페이징/정렬을 적용하고 액션 요약을 함께 반환한다")
    void findPage() {
        MeetingNote entity = sampleMeetingNote(1L);
        when(meetingNoteRepository.findAll(any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(entity)));
        when(meetingActionItemRepository.countByMeetingNoteId(1L)).thenReturn(4L);
        when(meetingActionItemRepository.countByMeetingNoteIdAndStatus(1L, "완료")).thenReturn(2L);

        Page<MeetingNoteListResponse> page = meetingNoteService.findPage(1, 10);

        verify(meetingNoteRepository).findAll(pageableCaptor.capture());
        Pageable pageable = pageableCaptor.getValue();
        Sort.Order idOrder = pageable.getSort().getOrderFor("id");

        assertThat(pageable.getPageNumber()).isEqualTo(1);
        assertThat(pageable.getPageSize()).isEqualTo(10);
        assertThat(idOrder).isNotNull();
        assertThat(idOrder.getDirection()).isEqualTo(Sort.Direction.DESC);

        assertThat(page.getContent()).hasSize(1);
        MeetingNoteListResponse response = page.getContent().get(0);
        assertThat(response.id()).isEqualTo(1L);
        assertThat(response.noteNo()).isEqualTo("MN-001");
        assertThat(response.actionTotal()).isEqualTo(4L);
        assertThat(response.actionDone()).isEqualTo(2L);
    }

    @Test
    @DisplayName("상세 조회 시 JSON 컬럼(agenda/decisions)을 배열로 파싱한다")
    void findById() {
        MeetingNote entity = sampleMeetingNote(3L);
        entity.setAgenda("[\"안건1\",\"안건2\"]");
        entity.setDecisions("[\"결정1\"]");
        when(meetingNoteRepository.findById(3L)).thenReturn(Optional.of(entity));
        when(meetingAttendeeRepository.findByMeetingNoteIdOrderByIdAsc(3L)).thenReturn(List.of(
                attendee(1L, 3L, 2L),
                attendee(2L, 3L, 3L)
        ));

        MeetingNoteDetailResponse response = meetingNoteService.findById(3L);

        assertThat(response.id()).isEqualTo(3L);
        assertThat(response.noteNo()).isEqualTo("MN-001");
        assertThat(response.attendeeIds()).containsExactly(2L, 3L);
        assertThat(response.agenda()).containsExactly("안건1", "안건2");
        assertThat(response.decisions()).containsExactly("결정1");
    }

    @Test
    @DisplayName("생성 시 기본값과 문서번호를 세팅하고 액션 아이템을 저장한다")
    void create() {
        MeetingNoteCreateRequest request = new MeetingNoteCreateRequest(
                "스프린트 킥오프",
                LocalDate.of(2026, 3, 1),
                " ",
                2L,
                List.of("안건1"),
                null,
                List.of("결정1"),
                10L,
                2L,
                List.of(2L, 3L),
                List.of(new MeetingActionItemItemRequest("요구사항 정리", 3L, LocalDate.of(2026, 3, 3), "대기", "work_request", 11L)),
                List.of(new MeetingNoteRelatedRefItemRequest("work_request", 11L, 1))
        );

        when(meetingNoteRepository.save(any(MeetingNote.class))).thenAnswer(invocation -> {
            MeetingNote row = invocation.getArgument(0);
            row.setId(100L);
            return row;
        });
        when(documentNoGenerator.next("MN")).thenReturn("MN-001");

        Long createdId = meetingNoteService.create(request);

        verify(meetingNoteRepository).save(meetingNoteCaptor.capture());
        verify(meetingActionItemRepository).saveAll(actionItemRowsCaptor.capture());
        verify(meetingAttendeeRepository).deleteByMeetingNoteId(100L);
        verify(meetingAttendeeRepository).flush();
        verify(meetingAttendeeRepository).insertIgnore(100L, 2L);
        verify(meetingAttendeeRepository).insertIgnore(100L, 3L);
        verify(meetingNoteRelatedRefRepository).saveAll(relatedRefRowsCaptor.capture());

        MeetingNote saved = meetingNoteCaptor.getValue();
        List<MeetingActionItem> actionRows = actionItemRowsCaptor.getValue();
        List<MeetingNoteRelatedRef> relatedRows = relatedRefRowsCaptor.getValue();

        assertThat(createdId).isEqualTo(100L);
        assertThat(saved.getNoteNo()).isEqualTo("MN-001");
        assertThat(saved.getLocation()).isNull();
        assertThat(saved.getContent()).isEqualTo("");
        assertThat(saved.getTeamId()).isEqualTo(10L);
        assertThat(saved.getCreatedBy()).isEqualTo(2L);

        assertThat(actionRows).hasSize(1);
        assertThat(actionRows.get(0).getStatus()).isEqualTo("대기");
        assertThat(actionRows.get(0).getLinkedRefType()).isEqualTo("WORK_REQUEST");

        assertThat(relatedRows).hasSize(1);
        assertThat(relatedRows.get(0).getRefType()).isEqualTo("WORK_REQUEST");
        assertThat(relatedRows.get(0).getRefId()).isEqualTo(11L);
    }

    @Test
    @DisplayName("수정 시 null이 아닌 필드만 반영하고 액션 아이템을 교체한다")
    void update() {
        MeetingNote entity = sampleMeetingNote(7L);
        when(meetingNoteRepository.findByIdForUpdate(7L)).thenReturn(Optional.of(entity));

        MeetingNoteUpdateRequest request = new MeetingNoteUpdateRequest(
                "수정 제목",
                null,
                "온라인",
                null,
                List.of("업데이트 안건"),
                "수정 내용",
                null,
                List.of(4L, 5L),
                List.of(new MeetingActionItemItemRequest("QA 점검", 4L, LocalDate.of(2026, 3, 4), "진행중", null, null)),
                List.of(new MeetingNoteRelatedRefItemRequest("tech_task", 22L, 2))
        );

        meetingNoteService.update(7L, request);

        verify(meetingActionItemRepository).deleteByMeetingNoteId(7L);
        verify(meetingActionItemRepository).saveAll(actionItemRowsCaptor.capture());
        verify(meetingAttendeeRepository).deleteByMeetingNoteId(7L);
        verify(meetingAttendeeRepository).flush();
        verify(meetingAttendeeRepository).insertIgnore(7L, 4L);
        verify(meetingAttendeeRepository).insertIgnore(7L, 5L);
        verify(meetingNoteRelatedRefRepository).deleteByMeetingNoteId(7L);
        verify(meetingNoteRelatedRefRepository).saveAll(relatedRefRowsCaptor.capture());

        assertThat(entity.getTitle()).isEqualTo("수정 제목");
        assertThat(entity.getLocation()).isEqualTo("온라인");
        assertThat(entity.getContent()).isEqualTo("수정 내용");
        assertThat(entity.getAgenda()).isEqualTo("[\"업데이트 안건\"]");

        List<MeetingActionItem> actionRows = actionItemRowsCaptor.getValue();
        List<MeetingNoteRelatedRef> relatedRows = relatedRefRowsCaptor.getValue();
        assertThat(actionRows).hasSize(1);
        assertThat(actionRows.get(0).getStatus()).isEqualTo("진행중");
        assertThat(relatedRows).hasSize(1);
        assertThat(relatedRows.get(0).getRefType()).isEqualTo("TECH_TASK");
        assertThat(relatedRows.get(0).getSortOrder()).isEqualTo(2);
    }

    @Test
    @DisplayName("액션 아이템 조회 성공")
    void getActionItems() {
        when(meetingNoteRepository.existsById(7L)).thenReturn(true);
        when(meetingActionItemRepository.findByMeetingNoteIdOrderByIdAsc(7L)).thenReturn(List.of(
                actionItem(1L, 7L, "요구사항 정리", "완료")
        ));

        List<MeetingActionItemResponse> result = meetingNoteService.getActionItems(7L);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).id()).isEqualTo(1L);
        assertThat(result.get(0).status()).isEqualTo("완료");
    }

    @Test
    @DisplayName("참석자 ID 조회 성공")
    void getAttendeeIds() {
        when(meetingNoteRepository.existsById(7L)).thenReturn(true);
        when(meetingAttendeeRepository.findByMeetingNoteIdOrderByIdAsc(7L)).thenReturn(List.of(
                attendee(1L, 7L, 2L),
                attendee(2L, 7L, 3L)
        ));

        List<Long> attendeeIds = meetingNoteService.getAttendeeIds(7L);

        assertThat(attendeeIds).containsExactly(2L, 3L);
    }

    @Test
    @DisplayName("연관 문서 조회 시 ref 메타데이터를 함께 반환한다")
    void getRelatedRefs() {
        WorkRequest wr = new WorkRequest();
        wr.setId(11L);
        wr.setRequestNo("WR-011");
        wr.setTitle("업무 요청");

        when(meetingNoteRepository.existsById(7L)).thenReturn(true);
        when(meetingNoteRelatedRefRepository.findByMeetingNoteIdOrderBySortOrderAscIdAsc(7L)).thenReturn(List.of(
                relatedRef(1L, 7L, "WORK_REQUEST", 11L, 1)
        ));
        when(workRequestRepository.findById(11L)).thenReturn(Optional.of(wr));

        List<MeetingNoteRelatedRefResponse> result = meetingNoteService.getRelatedRefs(7L);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).refType()).isEqualTo("WORK_REQUEST");
        assertThat(result.get(0).refId()).isEqualTo(11L);
        assertThat(result.get(0).refNo()).isEqualTo("WR-011");
        assertThat(result.get(0).title()).isEqualTo("업무 요청");
    }

    @Test
    @DisplayName("액션 아이템 상태 변경 성공")
    void updateActionItemStatus() {
        MeetingActionItem row = actionItem(3L, 7L, "QA 점검", "대기");
        when(meetingNoteRepository.existsById(7L)).thenReturn(true);
        when(meetingActionItemRepository.findByIdAndMeetingNoteId(3L, 7L)).thenReturn(Optional.of(row));

        meetingNoteService.updateActionItemStatus(7L, 3L, new MeetingActionItemStatusUpdateRequest("완료"));

        assertThat(row.getStatus()).isEqualTo("완료");
    }

    @Test
    @DisplayName("액션 아이템 상태 변경 시 status가 비어 있으면 400")
    void updateActionItemStatusBadRequest() {
        assertThatThrownBy(() -> meetingNoteService.updateActionItemStatus(7L, 3L, new MeetingActionItemStatusUpdateRequest(" ")))
                .isInstanceOfSatisfying(ResponseStatusException.class, ex ->
                        assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST)
                );
    }

    private MeetingNote sampleMeetingNote(Long id) {
        MeetingNote entity = new MeetingNote();
        entity.setId(id);
        entity.setNoteNo("MN-001");
        entity.setTeamId(10L);
        entity.setTitle("회의 제목");
        entity.setMeetingDate(LocalDate.of(2026, 3, 1));
        entity.setLocation("회의실 A");
        entity.setFacilitatorId(2L);
        entity.setAgenda("[\"안건\"]");
        entity.setContent("회의 내용");
        entity.setDecisions("[\"결정\"]");
        entity.setCreatedBy(2L);
        entity.setCreatedAt(LocalDateTime.of(2026, 2, 24, 11, 0));
        entity.setUpdatedAt(LocalDateTime.of(2026, 2, 24, 12, 0));
        return entity;
    }

    private MeetingActionItem actionItem(Long id, Long meetingNoteId, String content, String status) {
        MeetingActionItem row = new MeetingActionItem();
        row.setId(id);
        row.setMeetingNoteId(meetingNoteId);
        row.setContent(content);
        row.setAssigneeId(3L);
        row.setDueDate(LocalDate.of(2026, 3, 3));
        row.setStatus(status);
        row.setLinkedRefType("WORK_REQUEST");
        row.setLinkedRefId(11L);
        return row;
    }

    private MeetingNoteRelatedRef relatedRef(Long id, Long meetingNoteId, String refType, Long refId, Integer sortOrder) {
        MeetingNoteRelatedRef row = new MeetingNoteRelatedRef();
        row.setId(id);
        row.setMeetingNoteId(meetingNoteId);
        row.setRefType(refType);
        row.setRefId(refId);
        row.setSortOrder(sortOrder);
        return row;
    }

    private MeetingAttendee attendee(Long id, Long meetingNoteId, Long userId) {
        MeetingAttendee row = new MeetingAttendee();
        row.setId(id);
        row.setMeetingNoteId(meetingNoteId);
        row.setUserId(userId);
        row.setAttended(true);
        return row;
    }
}
