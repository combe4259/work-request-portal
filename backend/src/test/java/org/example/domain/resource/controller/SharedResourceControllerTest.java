package org.example.domain.resource.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.domain.resource.dto.SharedResourceCreateRequest;
import org.example.domain.resource.dto.SharedResourceDetailResponse;
import org.example.domain.resource.dto.SharedResourceListResponse;
import org.example.domain.resource.dto.SharedResourceUpdateRequest;
import org.example.domain.resource.service.SharedResourceService;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(SharedResourceController.class)
class SharedResourceControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private SharedResourceService sharedResourceService;

    @Test
    @DisplayName("리소스 목록 조회는 페이지 파라미터를 전달한다")
    void getResources() throws Exception {
        when(sharedResourceService.findPage(1, 5)).thenReturn(new PageImpl<>(
                List.of(listResponse(1L)),
                PageRequest.of(1, 5),
                6
        ));

        mockMvc.perform(get("/api/resources")
                        .param("page", "1")
                        .param("size", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(1L))
                .andExpect(jsonPath("$.content[0].title").value("팀 위키"))
                .andExpect(jsonPath("$.number").value(1))
                .andExpect(jsonPath("$.size").value(5));

        verify(sharedResourceService).findPage(1, 5);
    }

    @Test
    @DisplayName("리소스 상세 조회 성공")
    void getResource() throws Exception {
        when(sharedResourceService.findById(1L)).thenReturn(detailResponse(1L));

        mockMvc.perform(get("/api/resources/{id}", 1L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1L))
                .andExpect(jsonPath("$.category").value("문서"));

        verify(sharedResourceService).findById(1L);
    }

    @Test
    @DisplayName("리소스 생성 성공")
    void createResource() throws Exception {
        SharedResourceCreateRequest request = new SharedResourceCreateRequest(
                "팀 위키",
                "https://example.com/wiki",
                "문서",
                "개발 문서 모음",
                10L,
                2L
        );
        when(sharedResourceService.create(eq(request))).thenReturn(50L);

        mockMvc.perform(post("/api/resources")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(50L));

        verify(sharedResourceService).create(eq(request));
    }

    @Test
    @DisplayName("리소스 수정 성공 시 204를 반환한다")
    void updateResource() throws Exception {
        SharedResourceUpdateRequest request = new SharedResourceUpdateRequest(
                "수정 제목",
                "https://example.com/wiki2",
                "GitHub",
                "설명 수정"
        );

        mockMvc.perform(put("/api/resources/{id}", 50L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNoContent());

        verify(sharedResourceService).update(eq(50L), eq(request));
    }

    @Test
    @DisplayName("리소스 삭제 성공 시 204를 반환한다")
    void deleteResource() throws Exception {
        mockMvc.perform(delete("/api/resources/{id}", 50L))
                .andExpect(status().isNoContent());

        verify(sharedResourceService).delete(50L);
    }

    private SharedResourceListResponse listResponse(Long id) {
        return new SharedResourceListResponse(
                id,
                "팀 위키",
                "https://example.com/wiki",
                "문서",
                "개발 문서 모음",
                2L,
                LocalDateTime.of(2026, 2, 25, 10, 0)
        );
    }

    private SharedResourceDetailResponse detailResponse(Long id) {
        return new SharedResourceDetailResponse(
                id,
                10L,
                "팀 위키",
                "https://example.com/wiki",
                "문서",
                "개발 문서 모음",
                2L,
                LocalDateTime.of(2026, 2, 25, 10, 0),
                LocalDateTime.of(2026, 2, 25, 10, 0)
        );
    }
}
