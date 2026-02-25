package org.example.domain.comment.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.domain.comment.dto.CommentCreateRequest;
import org.example.domain.comment.dto.CommentDetailResponse;
import org.example.domain.comment.dto.CommentListResponse;
import org.example.domain.comment.dto.CommentUpdateRequest;
import org.example.domain.comment.service.CommentService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(CommentController.class)
class CommentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private CommentService commentService;

    @Test
    @DisplayName("댓글 목록 조회는 ref/page 파라미터를 전달한다")
    void getComments() throws Exception {
        when(commentService.findPage("WORK_REQUEST", 11L, 1, 5)).thenReturn(new PageImpl<>(
                List.of(listResponse(1L)),
                PageRequest.of(1, 5),
                6
        ));

        mockMvc.perform(get("/api/comments")
                        .param("refType", "WORK_REQUEST")
                        .param("refId", "11")
                        .param("page", "1")
                        .param("size", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(1L))
                .andExpect(jsonPath("$.content[0].content").value("코멘트 내용"))
                .andExpect(jsonPath("$.number").value(1))
                .andExpect(jsonPath("$.size").value(5));

        verify(commentService).findPage("WORK_REQUEST", 11L, 1, 5);
    }

    @Test
    @DisplayName("댓글 상세 조회 성공")
    void getComment() throws Exception {
        when(commentService.findById(1L)).thenReturn(detailResponse(1L));

        mockMvc.perform(get("/api/comments/{id}", 1L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1L))
                .andExpect(jsonPath("$.refType").value("WORK_REQUEST"));

        verify(commentService).findById(1L);
    }

    @Test
    @DisplayName("댓글 생성 성공")
    void createComment() throws Exception {
        CommentCreateRequest request = new CommentCreateRequest(
                "WORK_REQUEST",
                11L,
                "코멘트",
                2L
        );

        when(commentService.create(eq(request))).thenReturn(50L);

        mockMvc.perform(post("/api/comments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(50L));

        verify(commentService).create(eq(request));
    }

    @Test
    @DisplayName("댓글 수정 성공 시 204를 반환한다")
    void updateComment() throws Exception {
        CommentUpdateRequest request = new CommentUpdateRequest("수정 코멘트");

        mockMvc.perform(patch("/api/comments/{id}", 50L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNoContent());

        verify(commentService).update(eq(50L), eq(request));
    }

    @Test
    @DisplayName("댓글 삭제 성공 시 204를 반환한다")
    void deleteComment() throws Exception {
        mockMvc.perform(delete("/api/comments/{id}", 50L))
                .andExpect(status().isNoContent());

        verify(commentService).delete(50L);
    }

    private CommentListResponse listResponse(Long id) {
        return new CommentListResponse(
                id,
                "WORK_REQUEST",
                11L,
                "코멘트 내용",
                2L,
                LocalDateTime.of(2026, 2, 25, 10, 0)
        );
    }

    private CommentDetailResponse detailResponse(Long id) {
        return new CommentDetailResponse(
                id,
                "WORK_REQUEST",
                11L,
                "코멘트 내용",
                2L,
                LocalDateTime.of(2026, 2, 25, 10, 0),
                LocalDateTime.of(2026, 2, 25, 10, 0)
        );
    }
}
