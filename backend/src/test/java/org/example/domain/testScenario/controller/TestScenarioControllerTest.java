package org.example.domain.testScenario.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.domain.testScenario.dto.TestScenarioCreateRequest;
import org.example.domain.testScenario.dto.TestScenarioDetailResponse;
import org.example.domain.testScenario.dto.TestScenarioExecutionUpdateRequest;
import org.example.domain.testScenario.dto.TestScenarioListQuery;
import org.example.domain.testScenario.dto.TestScenarioListResponse;
import org.example.domain.testScenario.dto.TestScenarioStatusUpdateRequest;
import org.example.domain.testScenario.dto.TestScenarioUpdateRequest;
import org.example.domain.testScenario.service.TestScenarioService;
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

@WebMvcTest(TestScenarioController.class)
class TestScenarioControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private TestScenarioService testScenarioService;

    @Test
    @DisplayName("테스트 시나리오 목록 조회는 기본 페이지 파라미터를 사용한다")
    void getTestScenariosWithDefaultPaging() throws Exception {
        when(testScenarioService.findPage(eq(0), eq(20), any(TestScenarioListQuery.class))).thenReturn(new PageImpl<>(
                List.of(listResponse(1L, "TS-0001")),
                PageRequest.of(0, 20),
                1
        ));

        mockMvc.perform(get("/api/test-scenarios"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(1L))
                .andExpect(jsonPath("$.content[0].scenarioNo").value("TS-0001"))
                .andExpect(jsonPath("$.number").value(0))
                .andExpect(jsonPath("$.size").value(20));

        verify(testScenarioService).findPage(eq(0), eq(20), eq(new TestScenarioListQuery(
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
    @DisplayName("테스트 시나리오 목록 조회는 전달된 페이지 파라미터를 사용한다")
    void getTestScenariosWithCustomPaging() throws Exception {
        when(testScenarioService.findPage(eq(2), eq(5), any(TestScenarioListQuery.class))).thenReturn(new PageImpl<>(
                List.of(listResponse(10L, "TS-0010")),
                PageRequest.of(2, 5),
                11
        ));

        mockMvc.perform(get("/api/test-scenarios?page=2&size=5&q=가입&type=E2E&priority=높음&status=실행중&assigneeId=7&deadlineFrom=2026-03-01&deadlineTo=2026-03-10&sortBy=deadline&sortDir=asc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(10L))
                .andExpect(jsonPath("$.number").value(2))
                .andExpect(jsonPath("$.size").value(5));

        verify(testScenarioService).findPage(eq(2), eq(5), eq(new TestScenarioListQuery(
                "가입",
                "E2E",
                "높음",
                "실행중",
                7L,
                LocalDate.of(2026, 3, 1),
                LocalDate.of(2026, 3, 10),
                "deadline",
                "asc"
        )));
    }

    @Test
    @DisplayName("테스트 시나리오 상세 조회 성공")
    void getTestScenarioSuccess() throws Exception {
        when(testScenarioService.findById(1L)).thenReturn(detailResponse(1L, "TS-0001", "회원가입 플로우 검증"));

        mockMvc.perform(get("/api/test-scenarios/{id}", 1L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1L))
                .andExpect(jsonPath("$.title").value("회원가입 플로우 검증"));

        verify(testScenarioService).findById(1L);
    }

    @Test
    @DisplayName("테스트 시나리오 상세 조회 시 서비스 404 예외가 전파된다")
    void getTestScenarioNotFound() throws Exception {
        when(testScenarioService.findById(999L))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "테스트 시나리오를 찾을 수 없습니다."));

        mockMvc.perform(get("/api/test-scenarios/{id}", 999L))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("테스트 시나리오 생성 성공")
    void createTestScenarioSuccess() throws Exception {
        TestScenarioCreateRequest request = new TestScenarioCreateRequest(
                "회원가입 플로우 검증",
                "설명",
                "E2E",
                "높음",
                "작성중",
                10L,
                2L,
                "사전조건",
                "[]",
                "기대결과",
                null,
                LocalDate.of(2026, 3, 7),
                null,
                null,
                1L
        );

        when(testScenarioService.create(eq(request))).thenReturn(50L);

        mockMvc.perform(post("/api/test-scenarios")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(50L));

        verify(testScenarioService).create(eq(request));
    }

    @Test
    @DisplayName("테스트 시나리오 수정 성공 시 204를 반환한다")
    void updateTestScenarioSuccess() throws Exception {
        TestScenarioUpdateRequest request = new TestScenarioUpdateRequest(
                "제목 수정",
                "설명 수정",
                "기능",
                "보통",
                "실행중",
                2L,
                "사전조건",
                "[]",
                "기대결과",
                "실제결과",
                LocalDate.of(2026, 3, 8),
                LocalDateTime.of(2026, 2, 25, 10, 30),
                "상태 메모"
        );

        mockMvc.perform(put("/api/test-scenarios/{id}", 50L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNoContent());

        verify(testScenarioService).update(eq(50L), eq(request));
    }

    @Test
    @DisplayName("테스트 시나리오 상태 변경 성공 시 204를 반환한다")
    void updateTestScenarioStatusSuccess() throws Exception {
        TestScenarioStatusUpdateRequest request = new TestScenarioStatusUpdateRequest("통과", "테스트 완료");

        mockMvc.perform(patch("/api/test-scenarios/{id}/status", 50L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNoContent());

        verify(testScenarioService).updateStatus(eq(50L), eq(request));
    }

    @Test
    @DisplayName("테스트 시나리오 실행 결과 변경 성공 시 204를 반환한다")
    void updateTestScenarioExecutionSuccess() throws Exception {
        TestScenarioExecutionUpdateRequest request = new TestScenarioExecutionUpdateRequest(
                List.of("PASS", "FAIL", "SKIP"),
                "1단계 성공, 2단계 실패",
                LocalDateTime.of(2026, 2, 26, 9, 30)
        );

        mockMvc.perform(patch("/api/test-scenarios/{id}/execution", 50L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNoContent());

        verify(testScenarioService).updateExecution(eq(50L), eq(request));
    }

    private TestScenarioListResponse listResponse(Long id, String scenarioNo) {
        return new TestScenarioListResponse(
                id,
                scenarioNo,
                "제목",
                "기능",
                "보통",
                "작성중",
                2L,
                LocalDate.of(2026, 3, 7),
                LocalDateTime.of(2026, 2, 24, 10, 30)
        );
    }

    private TestScenarioDetailResponse detailResponse(Long id, String scenarioNo, String title) {
        return new TestScenarioDetailResponse(
                id,
                scenarioNo,
                title,
                "설명",
                "기능",
                "보통",
                "작성중",
                10L,
                2L,
                "사전조건",
                "[]",
                "기대결과",
                null,
                LocalDate.of(2026, 3, 7),
                null,
                null,
                1L,
                LocalDateTime.of(2026, 2, 24, 10, 30),
                LocalDateTime.of(2026, 2, 24, 10, 30)
        );
    }
}
