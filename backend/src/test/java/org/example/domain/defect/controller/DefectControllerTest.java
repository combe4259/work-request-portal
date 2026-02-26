package org.example.domain.defect.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.domain.defect.dto.DefectCreateRequest;
import org.example.domain.defect.dto.DefectDetailResponse;
import org.example.domain.defect.dto.DefectListQuery;
import org.example.domain.defect.dto.DefectListResponse;
import org.example.domain.defect.dto.DefectStatusUpdateRequest;
import org.example.domain.defect.dto.DefectUpdateRequest;
import org.example.domain.defect.service.DefectService;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(DefectController.class)
class DefectControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private DefectService defectService;

    @Test
    @DisplayName("결함 목록 조회는 기본 페이지 파라미터를 사용한다")
    void getDefectsWithDefaultPaging() throws Exception {
        when(defectService.findPage(eq(0), eq(20), any(DefectListQuery.class))).thenReturn(new PageImpl<>(
                List.of(listResponse(1L, "DF-0001")),
                PageRequest.of(0, 20),
                1
        ));

        mockMvc.perform(get("/api/defects"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(1L))
                .andExpect(jsonPath("$.content[0].defectNo").value("DF-0001"))
                .andExpect(jsonPath("$.number").value(0))
                .andExpect(jsonPath("$.size").value(20));

        verify(defectService).findPage(eq(0), eq(20), eq(new DefectListQuery(
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
    @DisplayName("결함 목록 조회는 전달된 페이지 파라미터를 사용한다")
    void getDefectsWithCustomPaging() throws Exception {
        when(defectService.findPage(eq(2), eq(5), any(DefectListQuery.class))).thenReturn(new PageImpl<>(
                List.of(listResponse(10L, "DF-0010")),
                PageRequest.of(2, 5),
                11
        ));

        mockMvc.perform(get("/api/defects?page=2&size=5&q=로그인&type=기능&severity=높음&status=분석중&assigneeId=7&deadlineFrom=2026-03-01&deadlineTo=2026-03-10&sortBy=deadline&sortDir=asc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(10L))
                .andExpect(jsonPath("$.number").value(2))
                .andExpect(jsonPath("$.size").value(5));

        verify(defectService).findPage(eq(2), eq(5), eq(new DefectListQuery(
                "로그인",
                "기능",
                "높음",
                "분석중",
                7L,
                LocalDate.of(2026, 3, 1),
                LocalDate.of(2026, 3, 10),
                "deadline",
                "asc"
        )));
    }

    @Test
    @DisplayName("결함 상세 조회 성공")
    void getDefectSuccess() throws Exception {
        when(defectService.findById(1L)).thenReturn(detailResponse(1L, "DF-0001", "로그인 버튼 비활성화 오류"));

        mockMvc.perform(get("/api/defects/{id}", 1L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1L))
                .andExpect(jsonPath("$.title").value("로그인 버튼 비활성화 오류"));

        verify(defectService).findById(1L);
    }

    @Test
    @DisplayName("결함 상세 조회 시 서비스 404 예외가 전파된다")
    void getDefectNotFound() throws Exception {
        when(defectService.findById(999L))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "결함을 찾을 수 없습니다."));

        mockMvc.perform(get("/api/defects/{id}", 999L))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("결함 생성 성공")
    void createDefectSuccess() throws Exception {
        DefectCreateRequest request = new DefectCreateRequest(
                "로그인 버튼 비활성화 오류",
                "설명",
                "기능",
                "높음",
                "접수",
                10L,
                "TEST_SCENARIO",
                17L,
                "Chrome",
                "[]",
                "기대 동작",
                "실제 동작",
                LocalDate.of(2026, 3, 7),
                null,
                1L,
                2L,
                null,
                null,
                null
        );

        when(defectService.create(eq(request))).thenReturn(50L);

        mockMvc.perform(post("/api/defects")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(50L));

        verify(defectService).create(eq(request));
    }

    @Test
    @DisplayName("결함 수정 성공 시 204를 반환한다")
    void updateDefectSuccess() throws Exception {
        DefectUpdateRequest request = new DefectUpdateRequest(
                "제목 수정",
                "설명 수정",
                "UI",
                "보통",
                "수정중",
                "WORK_REQUEST",
                49L,
                "iOS",
                "[]",
                "기대 동작",
                "실제 동작",
                LocalDate.of(2026, 3, 8),
                "메모",
                2L,
                LocalDateTime.of(2026, 2, 25, 10, 30),
                null,
                null
        );

        mockMvc.perform(put("/api/defects/{id}", 50L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNoContent());

        verify(defectService).update(eq(50L), eq(request));
    }

    @Test
    @DisplayName("결함 상태 변경 성공 시 204를 반환한다")
    void updateDefectStatusSuccess() throws Exception {
        DefectStatusUpdateRequest request = new DefectStatusUpdateRequest("완료", "해결 완료");

        mockMvc.perform(patch("/api/defects/{id}/status", 50L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNoContent());

        verify(defectService).updateStatus(eq(50L), eq(request));
    }

    private DefectListResponse listResponse(Long id, String defectNo) {
        return new DefectListResponse(
                id,
                defectNo,
                "제목",
                "기능",
                "높음",
                "접수",
                1L,
                2L,
                "TEST_SCENARIO",
                17L,
                LocalDate.of(2026, 3, 7),
                LocalDateTime.of(2026, 2, 24, 10, 30)
        );
    }

    private DefectDetailResponse detailResponse(Long id, String defectNo, String title) {
        return new DefectDetailResponse(
                id,
                defectNo,
                title,
                "설명",
                "기능",
                "높음",
                "접수",
                10L,
                "TEST_SCENARIO",
                17L,
                "Chrome",
                "[]",
                "기대 동작",
                "실제 동작",
                LocalDate.of(2026, 3, 7),
                null,
                1L,
                2L,
                null,
                null,
                null,
                LocalDateTime.of(2026, 2, 24, 10, 30),
                LocalDateTime.of(2026, 2, 24, 10, 30)
        );
    }
}
