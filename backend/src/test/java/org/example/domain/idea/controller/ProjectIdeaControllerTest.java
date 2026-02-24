package org.example.domain.idea.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.domain.idea.dto.ProjectIdeaCreateRequest;
import org.example.domain.idea.dto.ProjectIdeaDetailResponse;
import org.example.domain.idea.dto.ProjectIdeaListResponse;
import org.example.domain.idea.dto.ProjectIdeaStatusUpdateRequest;
import org.example.domain.idea.dto.ProjectIdeaUpdateRequest;
import org.example.domain.idea.dto.ProjectIdeaVoteResponse;
import org.example.domain.idea.service.ProjectIdeaService;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ProjectIdeaController.class)
class ProjectIdeaControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private ProjectIdeaService projectIdeaService;

    @Test
    @DisplayName("아이디어 목록 조회는 기본 페이지 파라미터를 사용한다")
    void getProjectIdeasWithDefaultPaging() throws Exception {
        when(projectIdeaService.findPage(0, 20)).thenReturn(new PageImpl<>(
                List.of(listResponse(1L, "ID-0001")),
                PageRequest.of(0, 20),
                1
        ));

        mockMvc.perform(get("/api/ideas"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(1L))
                .andExpect(jsonPath("$.content[0].ideaNo").value("ID-0001"))
                .andExpect(jsonPath("$.number").value(0))
                .andExpect(jsonPath("$.size").value(20));

        verify(projectIdeaService).findPage(0, 20);
    }

    @Test
    @DisplayName("아이디어 상세 조회 성공")
    void getProjectIdeaSuccess() throws Exception {
        when(projectIdeaService.findById(1L)).thenReturn(detailResponse(1L, "ID-0001", "개선 아이디어"));

        mockMvc.perform(get("/api/ideas/{id}", 1L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1L))
                .andExpect(jsonPath("$.title").value("개선 아이디어"));

        verify(projectIdeaService).findById(1L);
    }

    @Test
    @DisplayName("아이디어 생성 성공")
    void createProjectIdeaSuccess() throws Exception {
        ProjectIdeaCreateRequest request = new ProjectIdeaCreateRequest(
                "개선 아이디어",
                "아이디어 내용",
                List.of("효과 1"),
                "UX/UI",
                "제안됨",
                null,
                10L,
                2L
        );

        when(projectIdeaService.create(eq(request))).thenReturn(7L);

        mockMvc.perform(post("/api/ideas")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(7L));

        verify(projectIdeaService).create(eq(request));
    }

    @Test
    @DisplayName("아이디어 수정 성공 시 204를 반환한다")
    void updateProjectIdeaSuccess() throws Exception {
        ProjectIdeaUpdateRequest request = new ProjectIdeaUpdateRequest(
                "수정 제목",
                "수정 내용",
                List.of("효과"),
                "기능",
                "검토중",
                "검토 메모"
        );

        mockMvc.perform(put("/api/ideas/{id}", 7L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNoContent());

        verify(projectIdeaService).update(eq(7L), eq(request));
    }

    @Test
    @DisplayName("아이디어 상태 변경 성공 시 204를 반환한다")
    void updateProjectIdeaStatusSuccess() throws Exception {
        ProjectIdeaStatusUpdateRequest request = new ProjectIdeaStatusUpdateRequest("채택", "반영 예정");

        mockMvc.perform(patch("/api/ideas/{id}/status", 7L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNoContent());

        verify(projectIdeaService).updateStatus(eq(7L), eq(request));
    }

    @Test
    @DisplayName("아이디어 좋아요 성공")
    void likeIdeaSuccess() throws Exception {
        when(projectIdeaService.likeIdea(eq(7L), eq("Bearer token")))
                .thenReturn(new ProjectIdeaVoteResponse(true, 11L));

        mockMvc.perform(post("/api/ideas/{id}/votes", 7L)
                        .header("Authorization", "Bearer token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.liked").value(true))
                .andExpect(jsonPath("$.likeCount").value(11L));
    }

    @Test
    @DisplayName("아이디어 좋아요 취소 성공")
    void unlikeIdeaSuccess() throws Exception {
        when(projectIdeaService.unlikeIdea(eq(7L), eq("Bearer token")))
                .thenReturn(new ProjectIdeaVoteResponse(false, 10L));

        mockMvc.perform(delete("/api/ideas/{id}/votes/me", 7L)
                        .header("Authorization", "Bearer token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.liked").value(false))
                .andExpect(jsonPath("$.likeCount").value(10L));
    }

    private ProjectIdeaListResponse listResponse(Long id, String ideaNo) {
        return new ProjectIdeaListResponse(
                id,
                ideaNo,
                "제목",
                "내용",
                "UX/UI",
                "제안됨",
                2L,
                5L,
                LocalDateTime.of(2026, 2, 24, 11, 0)
        );
    }

    private ProjectIdeaDetailResponse detailResponse(Long id, String ideaNo, String title) {
        return new ProjectIdeaDetailResponse(
                id,
                ideaNo,
                10L,
                title,
                "내용",
                List.of("효과1"),
                "UX/UI",
                "제안됨",
                null,
                2L,
                5L,
                LocalDateTime.of(2026, 2, 24, 11, 0),
                LocalDateTime.of(2026, 2, 24, 11, 0)
        );
    }
}
