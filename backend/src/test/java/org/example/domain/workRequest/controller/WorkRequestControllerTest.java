package org.example.domain.workRequest.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.domain.workRequest.dto.WorkRequestCreateRequest;
import org.example.domain.workRequest.dto.WorkRequestDetailResponse;
import org.example.domain.workRequest.dto.WorkRequestListResponse;
import org.example.domain.workRequest.dto.WorkRequestStatusUpdateRequest;
import org.example.domain.workRequest.dto.WorkRequestUpdateRequest;
import org.example.domain.workRequest.service.WorkRequestService;
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

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(WorkRequestController.class)
class WorkRequestControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private WorkRequestService workRequestService;

    @Test
    @DisplayName("업무요청 목록 조회는 기본 페이지 파라미터를 사용한다")
    void getWorkRequestsWithDefaultPaging() throws Exception {
        when(workRequestService.findPage(0, 20)).thenReturn(new PageImpl<>(
                List.of(listResponse(1L, "WR-0001")),
                PageRequest.of(0, 20),
                1
        ));

        mockMvc.perform(get("/api/work-requests"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(1L))
                .andExpect(jsonPath("$.content[0].requestNo").value("WR-0001"))
                .andExpect(jsonPath("$.number").value(0))
                .andExpect(jsonPath("$.size").value(20));

        verify(workRequestService).findPage(0, 20);
    }

    @Test
    @DisplayName("업무요청 목록 조회는 전달된 페이지 파라미터를 사용한다")
    void getWorkRequestsWithCustomPaging() throws Exception {
        when(workRequestService.findPage(2, 5)).thenReturn(new PageImpl<>(
                List.of(listResponse(10L, "WR-0010")),
                PageRequest.of(2, 5),
                11
        ));

        mockMvc.perform(get("/api/work-requests?page=2&size=5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(10L))
                .andExpect(jsonPath("$.number").value(2))
                .andExpect(jsonPath("$.size").value(5));

        verify(workRequestService).findPage(2, 5);
    }

    @Test
    @DisplayName("업무요청 상세 조회 성공")
    void getWorkRequestSuccess() throws Exception {
        when(workRequestService.findById(1L)).thenReturn(detailResponse(1L, "WR-0001", "로그인 버그 수정"));

        mockMvc.perform(get("/api/work-requests/{id}", 1L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1L))
                .andExpect(jsonPath("$.title").value("로그인 버그 수정"));

        verify(workRequestService).findById(1L);
    }

    @Test
    @DisplayName("업무요청 상세 조회 시 서비스 404 예외가 전파된다")
    void getWorkRequestNotFound() throws Exception {
        when(workRequestService.findById(999L))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "업무요청을 찾을 수 없습니다."));

        mockMvc.perform(get("/api/work-requests/{id}", 999L))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("업무요청 생성 성공")
    void createWorkRequestSuccess() throws Exception {
        WorkRequestCreateRequest request = new WorkRequestCreateRequest(
                "로그인 개선",
                "사용자 문의 증가",
                "로그인 오류 재현 및 수정",
                "BUG",
                "HIGH",
                "NEW",
                10L,
                1L,
                2L,
                LocalDate.of(2026, 3, 3)
        );

        when(workRequestService.create(eq(request))).thenReturn(50L);

        mockMvc.perform(post("/api/work-requests")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(50L));

        verify(workRequestService).create(eq(request));
    }

    @Test
    @DisplayName("업무요청 수정 성공 시 204를 반환한다")
    void updateWorkRequestSuccess() throws Exception {
        WorkRequestUpdateRequest request = new WorkRequestUpdateRequest(
                "로그인 개선(수정)",
                "배경",
                "설명",
                "BUG",
                "HIGH",
                "IN_PROGRESS",
                2L,
                LocalDate.of(2026, 3, 5),
                LocalDateTime.of(2026, 2, 25, 9, 0),
                null,
                null,
                null
        );

        mockMvc.perform(put("/api/work-requests/{id}", 50L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNoContent());

        verify(workRequestService).update(eq(50L), eq(request));
    }

    @Test
    @DisplayName("업무요청 상태 수정 성공 시 204를 반환한다")
    void updateWorkRequestStatusSuccess() throws Exception {
        WorkRequestStatusUpdateRequest request = new WorkRequestStatusUpdateRequest("완료", "확인 완료");

        mockMvc.perform(patch("/api/work-requests/{id}/status", 50L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNoContent());

        verify(workRequestService).updateStatus(eq(50L), eq(request));
    }

    private WorkRequestListResponse listResponse(Long id, String requestNo) {
        return new WorkRequestListResponse(
                id,
                requestNo,
                "제목",
                "BUG",
                "HIGH",
                "NEW",
                2L,
                LocalDate.of(2026, 3, 3),
                LocalDateTime.of(2026, 2, 24, 10, 30)
        );
    }

    private WorkRequestDetailResponse detailResponse(Long id, String requestNo, String title) {
        return new WorkRequestDetailResponse(
                id,
                requestNo,
                title,
                "배경",
                "설명",
                "BUG",
                "HIGH",
                "NEW",
                10L,
                1L,
                2L,
                LocalDate.of(2026, 3, 3),
                null,
                null,
                null,
                null,
                LocalDateTime.of(2026, 2, 24, 10, 30),
                LocalDateTime.of(2026, 2, 24, 10, 30)
        );
    }
}
