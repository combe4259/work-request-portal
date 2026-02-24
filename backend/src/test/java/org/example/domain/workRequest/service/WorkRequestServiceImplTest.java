package org.example.domain.workRequest.service;

import jakarta.persistence.EntityNotFoundException;
import org.example.domain.workRequest.dto.WorkRequestCreateRequest;
import org.example.domain.workRequest.dto.WorkRequestDetailResponse;
import org.example.domain.workRequest.dto.WorkRequestListResponse;
import org.example.domain.workRequest.dto.WorkRequestUpdateRequest;
import org.example.domain.workRequest.entity.WorkRequest;
import org.example.domain.workRequest.repository.WorkRequestQueryRepository;
import org.example.domain.workRequest.repository.WorkRequestRepository;
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
class WorkRequestServiceImplTest {

    @Mock
    private WorkRequestRepository workRequestRepository;

    @Mock
    private WorkRequestQueryRepository workRequestQueryRepository;

    @InjectMocks
    private WorkRequestServiceImpl workRequestService;

    @Captor
    private ArgumentCaptor<WorkRequest> workRequestCaptor;

    @Captor
    private ArgumentCaptor<Pageable> pageableCaptor;

    @Test
    @DisplayName("목록 조회 시 페이징/정렬을 적용하고 리스트 응답으로 매핑한다")
    void findPage() {
        WorkRequest entity = sampleEntity(1L);
        when(workRequestRepository.findAll(any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(entity)));

        Page<WorkRequestListResponse> page = workRequestService.findPage(2, 5);

        verify(workRequestRepository).findAll(pageableCaptor.capture());
        Pageable pageable = pageableCaptor.getValue();
        Sort.Order idOrder = pageable.getSort().getOrderFor("id");

        assertThat(pageable.getPageNumber()).isEqualTo(2);
        assertThat(pageable.getPageSize()).isEqualTo(5);
        assertThat(idOrder).isNotNull();
        assertThat(idOrder.getDirection()).isEqualTo(Sort.Direction.DESC);

        assertThat(page.getContent()).hasSize(1);
        WorkRequestListResponse response = page.getContent().get(0);
        assertThat(response.id()).isEqualTo(1L);
        assertThat(response.requestNo()).isEqualTo("WR-001");
        assertThat(response.title()).isEqualTo("업무요청 제목");
    }

    @Test
    @DisplayName("상세 조회 성공 시 엔티티를 상세 응답으로 반환한다")
    void findById() {
        WorkRequest entity = sampleEntity(3L);
        when(workRequestRepository.findById(3L)).thenReturn(Optional.of(entity));

        WorkRequestDetailResponse response = workRequestService.findById(3L);

        assertThat(response.id()).isEqualTo(3L);
        assertThat(response.requestNo()).isEqualTo("WR-001");
        assertThat(response.description()).isEqualTo("상세 내용");
        assertThat(response.teamId()).isEqualTo(10L);
        assertThat(response.requesterId()).isEqualTo(20L);
    }

    @Test
    @DisplayName("상세 조회 대상이 없으면 예외를 던진다")
    void findByIdNotFound() {
        when(workRequestRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> workRequestService.findById(999L))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessageContaining("WorkRequest not found");
    }

    @Test
    @DisplayName("생성 시 기본값(type/priority/status)과 요청번호를 세팅한다")
    void create() {
        WorkRequestCreateRequest request = new WorkRequestCreateRequest(
                "새 요청",
                "배경",
                "요청 상세",
                "",
                " ",
                null,
                10L,
                20L,
                null,
                LocalDate.of(2026, 3, 1)
        );

        when(workRequestRepository.save(any(WorkRequest.class))).thenAnswer(invocation -> {
            WorkRequest wr = invocation.getArgument(0);
            wr.setId(100L);
            return wr;
        });

        Long createdId = workRequestService.create(request);

        verify(workRequestRepository).save(workRequestCaptor.capture());
        WorkRequest saved = workRequestCaptor.getValue();

        assertThat(createdId).isEqualTo(100L);
        assertThat(saved.getRequestNo()).startsWith("WR-");
        assertThat(saved.getType()).isEqualTo("기능개선");
        assertThat(saved.getPriority()).isEqualTo("보통");
        assertThat(saved.getStatus()).isEqualTo("접수대기");
        assertThat(saved.getTeamId()).isEqualTo(10L);
        assertThat(saved.getRequesterId()).isEqualTo(20L);
    }

    @Test
    @DisplayName("수정 시 null이 아닌 필드만 반영한다")
    void update() {
        WorkRequest entity = sampleEntity(7L);
        when(workRequestRepository.findById(7L)).thenReturn(Optional.of(entity));

        WorkRequestUpdateRequest request = new WorkRequestUpdateRequest(
                "수정 제목",
                null,
                "수정 내용",
                null,
                "긴급",
                "테스트중",
                null,
                LocalDate.of(2026, 3, 15),
                LocalDateTime.of(2026, 2, 25, 9, 0),
                null,
                null,
                null
        );

        workRequestService.update(7L, request);

        assertThat(entity.getTitle()).isEqualTo("수정 제목");
        assertThat(entity.getDescription()).isEqualTo("수정 내용");
        assertThat(entity.getPriority()).isEqualTo("긴급");
        assertThat(entity.getStatus()).isEqualTo("테스트중");
        assertThat(entity.getDeadline()).isEqualTo(LocalDate.of(2026, 3, 15));
        assertThat(entity.getStartedAt()).isEqualTo(LocalDateTime.of(2026, 2, 25, 9, 0));
        assertThat(entity.getBackground()).isEqualTo("요청 배경");
        assertThat(entity.getAssigneeId()).isEqualTo(30L);
    }

    private WorkRequest sampleEntity(Long id) {
        WorkRequest entity = new WorkRequest();
        entity.setId(id);
        entity.setRequestNo("WR-001");
        entity.setTitle("업무요청 제목");
        entity.setBackground("요청 배경");
        entity.setDescription("상세 내용");
        entity.setType("기능개선");
        entity.setPriority("보통");
        entity.setStatus("검토중");
        entity.setTeamId(10L);
        entity.setRequesterId(20L);
        entity.setAssigneeId(30L);
        entity.setDeadline(LocalDate.of(2026, 2, 28));
        entity.setStartedAt(LocalDateTime.of(2026, 2, 10, 10, 0));
        entity.setCreatedAt(LocalDateTime.of(2026, 2, 1, 9, 0));
        entity.setUpdatedAt(LocalDateTime.of(2026, 2, 2, 9, 0));
        return entity;
    }
}
