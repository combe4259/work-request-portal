package org.example.domain.deployment.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.domain.deployment.dto.DeploymentCreateRequest;
import org.example.domain.deployment.dto.DeploymentDetailResponse;
import org.example.domain.deployment.dto.DeploymentListResponse;
import org.example.domain.deployment.dto.DeploymentRelatedRefItemRequest;
import org.example.domain.deployment.dto.DeploymentRelatedRefResponse;
import org.example.domain.deployment.dto.DeploymentRelatedRefsUpdateRequest;
import org.example.domain.deployment.dto.DeploymentStatusUpdateRequest;
import org.example.domain.deployment.dto.DeploymentStepResponse;
import org.example.domain.deployment.dto.DeploymentStepsReplaceRequest;
import org.example.domain.deployment.dto.DeploymentStepUpdateRequest;
import org.example.domain.deployment.dto.DeploymentUpdateRequest;
import org.example.domain.deployment.service.DeploymentService;
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

@WebMvcTest(DeploymentController.class)
class DeploymentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private DeploymentService deploymentService;

    @Test
    @DisplayName("배포 목록 조회는 기본 페이지 파라미터를 사용한다")
    void getDeploymentsWithDefaultPaging() throws Exception {
        when(deploymentService.findPage(0, 20)).thenReturn(new PageImpl<>(
                List.of(listResponse(1L, "DP-0001")),
                PageRequest.of(0, 20),
                1
        ));

        mockMvc.perform(get("/api/deployments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(1L))
                .andExpect(jsonPath("$.content[0].deployNo").value("DP-0001"))
                .andExpect(jsonPath("$.number").value(0))
                .andExpect(jsonPath("$.size").value(20));

        verify(deploymentService).findPage(0, 20);
    }

    @Test
    @DisplayName("배포 상세 조회 성공")
    void getDeploymentSuccess() throws Exception {
        when(deploymentService.findById(1L)).thenReturn(detailResponse(1L, "DP-0001", "2월 정기 배포"));

        mockMvc.perform(get("/api/deployments/{id}", 1L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1L))
                .andExpect(jsonPath("$.title").value("2월 정기 배포"));

        verify(deploymentService).findById(1L);
    }

    @Test
    @DisplayName("배포 상세 조회 시 서비스 404 예외가 전파된다")
    void getDeploymentNotFound() throws Exception {
        when(deploymentService.findById(999L))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "배포를 찾을 수 없습니다."));

        mockMvc.perform(get("/api/deployments/{id}", 999L))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("배포 생성 성공")
    void createDeploymentSuccess() throws Exception {
        DeploymentCreateRequest request = new DeploymentCreateRequest(
                "2월 정기 배포",
                "개요",
                "롤백 계획",
                "v2.3.0",
                "정기배포",
                "운영",
                "대기",
                10L,
                2L,
                LocalDate.of(2026, 2, 28),
                null,
                null,
                null,
                null,
                null,
                null,
                List.of(new DeploymentRelatedRefItemRequest("WORK_REQUEST", 51L, 1)),
                List.of("빌드", "배포")
        );

        when(deploymentService.create(eq(request))).thenReturn(50L);

        mockMvc.perform(post("/api/deployments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(50L));

        verify(deploymentService).create(eq(request));
    }

    @Test
    @DisplayName("배포 수정 성공 시 204를 반환한다")
    void updateDeploymentSuccess() throws Exception {
        DeploymentUpdateRequest request = new DeploymentUpdateRequest(
                "제목 수정",
                "개요 수정",
                "롤백 수정",
                "v2.3.1",
                "핫픽스",
                "스테이징",
                "진행중",
                2L,
                LocalDate.of(2026, 3, 1),
                LocalDateTime.of(2026, 2, 28, 9, 0),
                null,
                null,
                null,
                "메모",
                null,
                List.of(new DeploymentRelatedRefItemRequest("TECH_TASK", 21L, 1)),
                List.of("단계1")
        );

        mockMvc.perform(put("/api/deployments/{id}", 50L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNoContent());

        verify(deploymentService).update(eq(50L), eq(request));
    }

    @Test
    @DisplayName("배포 상태 변경 성공 시 204를 반환한다")
    void updateDeploymentStatusSuccess() throws Exception {
        DeploymentStatusUpdateRequest request = new DeploymentStatusUpdateRequest("완료", "배포 완료");

        mockMvc.perform(patch("/api/deployments/{id}/status", 50L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNoContent());

        verify(deploymentService).updateStatus(eq(50L), eq(request));
    }

    @Test
    @DisplayName("배포 연관 문서 조회 성공")
    void getRelatedRefsSuccess() throws Exception {
        when(deploymentService.getRelatedRefs(50L)).thenReturn(List.of(
                new DeploymentRelatedRefResponse("WORK_REQUEST", 51L, "WR-051", "모바일 레이아웃 개선")
        ));

        mockMvc.perform(get("/api/deployments/{id}/related-refs", 50L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].refType").value("WORK_REQUEST"))
                .andExpect(jsonPath("$[0].refNo").value("WR-051"));
    }

    @Test
    @DisplayName("배포 연관 문서 교체 성공")
    void replaceRelatedRefsSuccess() throws Exception {
        DeploymentRelatedRefsUpdateRequest request = new DeploymentRelatedRefsUpdateRequest(List.of(
                new DeploymentRelatedRefItemRequest("WORK_REQUEST", 51L, 1),
                new DeploymentRelatedRefItemRequest("TECH_TASK", 21L, 2)
        ));

        mockMvc.perform(put("/api/deployments/{id}/related-refs", 50L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNoContent());

        verify(deploymentService).replaceRelatedRefs(eq(50L), eq(request));
    }

    @Test
    @DisplayName("배포 절차 조회 성공")
    void getStepsSuccess() throws Exception {
        when(deploymentService.getSteps(50L)).thenReturn(List.of(
                new DeploymentStepResponse(7L, 1, "빌드", true, LocalDateTime.of(2026, 2, 28, 9, 10))
        ));

        mockMvc.perform(get("/api/deployments/{id}/steps", 50L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(7L))
                .andExpect(jsonPath("$[0].isDone").value(true));
    }

    @Test
    @DisplayName("배포 절차 교체 성공")
    void replaceStepsSuccess() throws Exception {
        DeploymentStepsReplaceRequest request = new DeploymentStepsReplaceRequest(List.of("빌드", "배포"));

        mockMvc.perform(put("/api/deployments/{id}/steps", 50L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNoContent());

        verify(deploymentService).replaceSteps(eq(50L), eq(request));
    }

    @Test
    @DisplayName("배포 절차 상태 변경 성공")
    void updateStepSuccess() throws Exception {
        DeploymentStepUpdateRequest request = new DeploymentStepUpdateRequest(true);

        mockMvc.perform(patch("/api/deployments/{id}/steps/{stepId}", 50L, 7L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNoContent());

        verify(deploymentService).updateStep(eq(50L), eq(7L), eq(request));
    }

    private DeploymentListResponse listResponse(Long id, String deployNo) {
        return new DeploymentListResponse(
                id,
                deployNo,
                "제목",
                "v2.3.0",
                "정기배포",
                "운영",
                "대기",
                2L,
                LocalDate.of(2026, 2, 28),
                LocalDateTime.of(2026, 2, 24, 10, 30)
        );
    }

    private DeploymentDetailResponse detailResponse(Long id, String deployNo, String title) {
        return new DeploymentDetailResponse(
                id,
                deployNo,
                title,
                "개요",
                "롤백",
                "v2.3.0",
                "정기배포",
                "운영",
                "대기",
                10L,
                2L,
                LocalDate.of(2026, 2, 28),
                null,
                null,
                null,
                null,
                null,
                null,
                LocalDateTime.of(2026, 2, 24, 10, 30),
                LocalDateTime.of(2026, 2, 24, 10, 30)
        );
    }
}
