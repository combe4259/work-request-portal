package org.example.domain.knowledgeBase.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.domain.knowledgeBase.dto.KnowledgeBaseArticleCreateRequest;
import org.example.domain.knowledgeBase.dto.KnowledgeBaseArticleDetailResponse;
import org.example.domain.knowledgeBase.dto.KnowledgeBaseArticleListResponse;
import org.example.domain.knowledgeBase.dto.KnowledgeBaseArticleUpdateRequest;
import org.example.domain.knowledgeBase.service.KnowledgeBaseArticleService;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(KnowledgeBaseArticleController.class)
class KnowledgeBaseArticleControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private KnowledgeBaseArticleService knowledgeBaseArticleService;

    @Test
    @DisplayName("지식베이스 목록 조회는 페이지 파라미터를 전달한다")
    void getArticles() throws Exception {
        when(knowledgeBaseArticleService.findPage(1, 5)).thenReturn(new PageImpl<>(
                List.of(listResponse(1L)),
                PageRequest.of(1, 5),
                6
        ));

        mockMvc.perform(get("/api/knowledge-base")
                        .param("page", "1")
                        .param("size", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(1L))
                .andExpect(jsonPath("$.content[0].articleNo").value("KB-001"))
                .andExpect(jsonPath("$.number").value(1))
                .andExpect(jsonPath("$.size").value(5));

        verify(knowledgeBaseArticleService).findPage(1, 5);
    }

    @Test
    @DisplayName("지식베이스 상세 조회 성공")
    void getArticle() throws Exception {
        when(knowledgeBaseArticleService.findById(1L)).thenReturn(detailResponse(1L));

        mockMvc.perform(get("/api/knowledge-base/{id}", 1L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1L))
                .andExpect(jsonPath("$.title").value("API 가이드"));

        verify(knowledgeBaseArticleService).findById(1L);
    }

    @Test
    @DisplayName("지식베이스 생성 성공")
    void createArticle() throws Exception {
        KnowledgeBaseArticleCreateRequest request = new KnowledgeBaseArticleCreateRequest(
                "API 가이드",
                "개발 가이드",
                List.of("backend", "api"),
                "요약",
                "본문",
                10L,
                2L
        );

        when(knowledgeBaseArticleService.create(eq(request))).thenReturn(50L);

        mockMvc.perform(post("/api/knowledge-base")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(50L));

        verify(knowledgeBaseArticleService).create(eq(request));
    }

    @Test
    @DisplayName("지식베이스 수정 성공 시 204를 반환한다")
    void updateArticle() throws Exception {
        KnowledgeBaseArticleUpdateRequest request = new KnowledgeBaseArticleUpdateRequest(
                "수정 제목",
                "아키텍처",
                List.of("ddd"),
                "요약 수정",
                "본문 수정"
        );

        mockMvc.perform(put("/api/knowledge-base/{id}", 50L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNoContent());

        verify(knowledgeBaseArticleService).update(eq(50L), eq(request));
    }

    @Test
    @DisplayName("조회수 증가 요청 성공 시 204를 반환한다")
    void increaseViewCount() throws Exception {
        mockMvc.perform(post("/api/knowledge-base/{id}/view", 50L))
                .andExpect(status().isNoContent());

        verify(knowledgeBaseArticleService).increaseViewCount(50L);
    }

    private KnowledgeBaseArticleListResponse listResponse(Long id) {
        return new KnowledgeBaseArticleListResponse(
                id,
                "KB-001",
                "API 가이드",
                "개발 가이드",
                List.of("backend", "api"),
                "요약",
                2L,
                10,
                LocalDateTime.of(2026, 2, 25, 10, 0),
                LocalDateTime.of(2026, 2, 25, 10, 0)
        );
    }

    private KnowledgeBaseArticleDetailResponse detailResponse(Long id) {
        return new KnowledgeBaseArticleDetailResponse(
                id,
                "KB-001",
                10L,
                "API 가이드",
                "개발 가이드",
                List.of("backend", "api"),
                "요약",
                "본문",
                2L,
                10,
                LocalDateTime.of(2026, 2, 25, 10, 0),
                LocalDateTime.of(2026, 2, 25, 10, 0)
        );
    }
}
