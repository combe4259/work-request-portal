package org.example.domain.techTask.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
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
import org.example.domain.techTask.service.TechTaskService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
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

@WebMvcTest(TechTaskController.class)
class TechTaskControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private TechTaskService techTaskService;

    @Test
    @DisplayName("기술과제 목록 조회는 기본 페이지 파라미터를 사용한다")
    void getTechTasksWithDefaultPaging() throws Exception {
        when(techTaskService.findPage(eq(0), eq(20), any(TechTaskListQuery.class))).thenReturn(new PageImpl<>(
                List.of(listResponse(1L, "TK-0001")),
                PageRequest.of(0, 20),
                1
        ));

        mockMvc.perform(get("/api/tech-tasks"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(1L))
                .andExpect(jsonPath("$.content[0].taskNo").value("TK-0001"))
                .andExpect(jsonPath("$.number").value(0))
                .andExpect(jsonPath("$.size").value(20));

        verify(techTaskService).findPage(eq(0), eq(20), eq(new TechTaskListQuery(
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                "id",
                "desc"
        )));
    }

    @Test
    @DisplayName("기술과제 목록 조회는 전달된 페이지 파라미터를 사용한다")
    void getTechTasksWithCustomPaging() throws Exception {
        when(techTaskService.findPage(eq(2), eq(5), any(TechTaskListQuery.class))).thenReturn(new PageImpl<>(
                List.of(listResponse(10L, "TK-0010")),
                PageRequest.of(2, 5),
                11
        ));

        mockMvc.perform(get("/api/tech-tasks?page=2&size=5&q=리팩토링&type=리팩토링&priority=높음&status=검토중&assigneeId=7&deadlineFrom=2026-03-01&deadlineTo=2026-03-10&sortBy=deadline&sortDir=asc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(10L))
                .andExpect(jsonPath("$.number").value(2))
                .andExpect(jsonPath("$.size").value(5));

        verify(techTaskService).findPage(eq(2), eq(5), eq(new TechTaskListQuery(
                "리팩토링",
                "리팩토링",
                "높음",
                "검토중",
                7L,
                LocalDate.of(2026, 3, 1),
                LocalDate.of(2026, 3, 10),
                "deadline",
                "asc"
        )));
    }

    @Test
    @DisplayName("기술과제 상세 조회 성공")
    void getTechTaskSuccess() throws Exception {
        when(techTaskService.findById(1L)).thenReturn(detailResponse(1L, "TK-0001", "서비스 리팩토링"));

        mockMvc.perform(get("/api/tech-tasks/{id}", 1L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1L))
                .andExpect(jsonPath("$.title").value("서비스 리팩토링"));

        verify(techTaskService).findById(1L);
    }

    @Test
    @DisplayName("기술과제 상세 조회 시 서비스 404 예외가 전파된다")
    void getTechTaskNotFound() throws Exception {
        when(techTaskService.findById(999L))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "기술과제를 찾을 수 없습니다."));

        mockMvc.perform(get("/api/tech-tasks/{id}", 999L))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("기술과제 생성 성공")
    void createTechTaskSuccess() throws Exception {
        TechTaskCreateRequest request = new TechTaskCreateRequest(
                "서비스 레이어 분리",
                "컨트롤러가 저장소를 직접 호출",
                "서비스 계층으로 이동",
                "[\"테스트 작성\"]",
                "리팩토링",
                "보통",
                "접수대기",
                10L,
                1L,
                2L,
                LocalDate.of(2026, 3, 7)
        );

        when(techTaskService.create(eq(request))).thenReturn(50L);

        mockMvc.perform(post("/api/tech-tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(50L));

        verify(techTaskService).create(eq(request));
    }

    @Test
    @DisplayName("기술과제 수정 성공 시 204를 반환한다")
    void updateTechTaskSuccess() throws Exception {
        TechTaskUpdateRequest request = new TechTaskUpdateRequest(
                "제목 수정",
                "문제 현황 수정",
                "개선 방안 수정",
                "[\"코드리뷰 승인\"]",
                "리팩토링",
                "높음",
                "개발중",
                2L,
                LocalDate.of(2026, 3, 9),
                LocalDateTime.of(2026, 2, 25, 9, 0),
                null,
                null,
                null
        );

        mockMvc.perform(put("/api/tech-tasks/{id}", 50L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNoContent());

        verify(techTaskService).update(eq(50L), eq(request));
    }

    @Test
    @DisplayName("기술과제 상태 변경 성공 시 204를 반환한다")
    void updateTechTaskStatusSuccess() throws Exception {
        TechTaskStatusUpdateRequest request = new TechTaskStatusUpdateRequest("완료", "done");

        mockMvc.perform(patch("/api/tech-tasks/{id}/status", 50L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNoContent());

        verify(techTaskService).updateStatus(eq(50L), eq(request));
    }

    @Test
    @DisplayName("기술과제 연관 문서 조회 성공")
    void getRelatedRefsSuccess() throws Exception {
        when(techTaskService.getRelatedRefs(50L)).thenReturn(List.of(
                new TechTaskRelatedRefResponse("WORK_REQUEST", 11L, "WR-011", "로그인 버그 수정")
        ));

        mockMvc.perform(get("/api/tech-tasks/{id}/related-refs", 50L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].refType").value("WORK_REQUEST"))
                .andExpect(jsonPath("$[0].refNo").value("WR-011"));
    }

    @Test
    @DisplayName("기술과제 연관 문서 교체 성공 시 204를 반환한다")
    void replaceRelatedRefsSuccess() throws Exception {
        TechTaskRelatedRefsUpdateRequest request = new TechTaskRelatedRefsUpdateRequest(List.of(
                new TechTaskRelatedRefItemRequest("WORK_REQUEST", 11L, 1),
                new TechTaskRelatedRefItemRequest("TECH_TASK", 12L, 2)
        ));

        mockMvc.perform(put("/api/tech-tasks/{id}/related-refs", 50L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNoContent());

        verify(techTaskService).replaceRelatedRefs(eq(50L), eq(request));
    }

    @Test
    @DisplayName("기술과제 PR 링크 조회 성공")
    void getPrLinksSuccess() throws Exception {
        when(techTaskService.getPrLinks(50L)).thenReturn(List.of(
                new TechTaskPrLinkResponse(7L, "feature/login", "42", "https://example.com/pr/42")
        ));

        mockMvc.perform(get("/api/tech-tasks/{id}/pr-links", 50L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(7L))
                .andExpect(jsonPath("$[0].branchName").value("feature/login"));
    }

    @Test
    @DisplayName("기술과제 PR 링크 생성 성공")
    void createPrLinkSuccess() throws Exception {
        TechTaskPrLinkCreateRequest request = new TechTaskPrLinkCreateRequest("feature/login", "42", "https://example.com/pr/42");
        when(techTaskService.createPrLink(eq(50L), eq(request))).thenReturn(7L);

        mockMvc.perform(post("/api/tech-tasks/{id}/pr-links", 50L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(7L));

        verify(techTaskService).createPrLink(eq(50L), eq(request));
    }

    @Test
    @DisplayName("기술과제 PR 링크 삭제 성공 시 204를 반환한다")
    void deletePrLinkSuccess() throws Exception {
        mockMvc.perform(delete("/api/tech-tasks/{id}/pr-links/{linkId}", 50L, 7L))
                .andExpect(status().isNoContent());

        verify(techTaskService).deletePrLink(50L, 7L);
    }

    private TechTaskListResponse listResponse(Long id, String taskNo) {
        return new TechTaskListResponse(
                id,
                taskNo,
                "제목",
                "리팩토링",
                "보통",
                "검토중",
                2L,
                LocalDate.of(2026, 3, 7),
                LocalDateTime.of(2026, 2, 24, 10, 30)
        );
    }

    private TechTaskDetailResponse detailResponse(Long id, String taskNo, String title) {
        return new TechTaskDetailResponse(
                id,
                taskNo,
                title,
                "문제 현황",
                "개선 방안",
                "[\"테스트 작성\"]",
                "리팩토링",
                "보통",
                "검토중",
                10L,
                1L,
                2L,
                LocalDate.of(2026, 3, 7),
                null,
                null,
                null,
                null,
                LocalDateTime.of(2026, 2, 24, 10, 30),
                LocalDateTime.of(2026, 2, 24, 10, 30)
        );
    }
}
