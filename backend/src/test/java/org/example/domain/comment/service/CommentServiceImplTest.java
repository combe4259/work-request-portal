package org.example.domain.comment.service;

import org.example.domain.comment.dto.CommentCreateRequest;
import org.example.domain.comment.dto.CommentListResponse;
import org.example.domain.comment.dto.CommentUpdateRequest;
import org.example.domain.comment.entity.Comment;
import org.example.domain.comment.repository.CommentRepository;
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
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CommentServiceImplTest {

    @Mock
    private CommentRepository commentRepository;

    @InjectMocks
    private CommentServiceImpl commentService;

    @Captor
    private ArgumentCaptor<Pageable> pageableCaptor;

    @Captor
    private ArgumentCaptor<Comment> commentCaptor;

    @Test
    @DisplayName("목록 조회 시 ref 조건과 페이징/정렬을 적용한다")
    void findPage() {
        Comment entity = sampleEntity(1L);
        when(commentRepository.findByRefTypeAndRefIdOrderByIdDesc(eq("WORK_REQUEST"), eq(11L), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(entity)));

        Page<CommentListResponse> page = commentService.findPage("work_request", 11L, 1, 5);

        verify(commentRepository).findByRefTypeAndRefIdOrderByIdDesc(eq("WORK_REQUEST"), eq(11L), pageableCaptor.capture());
        Pageable pageable = pageableCaptor.getValue();
        Sort.Order idOrder = pageable.getSort().getOrderFor("id");

        assertThat(pageable.getPageNumber()).isEqualTo(1);
        assertThat(pageable.getPageSize()).isEqualTo(5);
        assertThat(idOrder).isNotNull();
        assertThat(idOrder.getDirection()).isEqualTo(Sort.Direction.DESC);

        assertThat(page.getContent()).hasSize(1);
        assertThat(page.getContent().get(0).content()).isEqualTo("코멘트 내용");
    }

    @Test
    @DisplayName("생성 시 refType/content를 정리해 저장한다")
    void create() {
        CommentCreateRequest request = new CommentCreateRequest(
                "  tech_task ",
                33L,
                "  확인 부탁드립니다  ",
                7L
        );

        when(commentRepository.save(any(Comment.class))).thenAnswer(invocation -> {
            Comment row = invocation.getArgument(0);
            row.setId(100L);
            return row;
        });

        Long id = commentService.create(request);

        verify(commentRepository).save(commentCaptor.capture());
        Comment saved = commentCaptor.getValue();

        assertThat(id).isEqualTo(100L);
        assertThat(saved.getRefType()).isEqualTo("TECH_TASK");
        assertThat(saved.getRefId()).isEqualTo(33L);
        assertThat(saved.getContent()).isEqualTo("확인 부탁드립니다");
        assertThat(saved.getAuthorId()).isEqualTo(7L);
    }

    @Test
    @DisplayName("수정 시 content를 업데이트한다")
    void update() {
        Comment entity = sampleEntity(9L);
        when(commentRepository.findById(9L)).thenReturn(Optional.of(entity));

        commentService.update(9L, new CommentUpdateRequest("  수정 코멘트  "));

        assertThat(entity.getContent()).isEqualTo("수정 코멘트");
    }

    @Test
    @DisplayName("생성 시 유효하지 않은 refType이면 400 예외를 던진다")
    void createBadRefType() {
        CommentCreateRequest request = new CommentCreateRequest(
                "invalid",
                10L,
                "코멘트",
                1L
        );

        assertThatThrownBy(() -> commentService.create(request))
                .isInstanceOfSatisfying(ResponseStatusException.class, ex ->
                        assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST)
                );
    }

    @Test
    @DisplayName("삭제 시 대상을 조회한 뒤 삭제한다")
    void delete() {
        Comment entity = sampleEntity(12L);
        when(commentRepository.findById(12L)).thenReturn(Optional.of(entity));

        commentService.delete(12L);

        verify(commentRepository).delete(entity);
    }

    private Comment sampleEntity(Long id) {
        Comment entity = new Comment();
        entity.setId(id);
        entity.setRefType("WORK_REQUEST");
        entity.setRefId(11L);
        entity.setContent("코멘트 내용");
        entity.setAuthorId(2L);
        entity.setCreatedAt(LocalDateTime.of(2026, 2, 25, 10, 0));
        entity.setUpdatedAt(LocalDateTime.of(2026, 2, 25, 10, 0));
        return entity;
    }
}
