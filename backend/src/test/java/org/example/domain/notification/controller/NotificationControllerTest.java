package org.example.domain.notification.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.domain.notification.dto.NotificationCreateRequest;
import org.example.domain.notification.dto.NotificationDetailResponse;
import org.example.domain.notification.dto.NotificationListResponse;
import org.example.domain.notification.dto.NotificationUpdateRequest;
import org.example.domain.notification.service.NotificationService;
import org.example.global.team.TeamRequestContext;
import org.junit.jupiter.api.AfterEach;
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

@WebMvcTest(NotificationController.class)
class NotificationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private NotificationService notificationService;

    @AfterEach
    void tearDown() {
        TeamRequestContext.clear();
    }

    @Test
    @DisplayName("알림 목록 조회는 기본 페이지 파라미터를 사용한다")
    void getNotificationsWithDefaultPaging() throws Exception {
        when(notificationService.findPage(null, null, 0, 20)).thenReturn(new PageImpl<>(
                List.of(listResponse(1L)),
                PageRequest.of(0, 20),
                1
        ));

        mockMvc.perform(get("/api/notifications"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(1L))
                .andExpect(jsonPath("$.number").value(0))
                .andExpect(jsonPath("$.size").value(20));

        verify(notificationService).findPage(null, null, 0, 20);
    }

    @Test
    @DisplayName("알림 목록 조회는 필터와 페이징 파라미터를 전달한다")
    void getNotificationsWithFilters() throws Exception {
        when(notificationService.findPage(2L, false, 1, 5)).thenReturn(new PageImpl<>(
                List.of(listResponse(10L)),
                PageRequest.of(1, 5),
                11
        ));

        mockMvc.perform(get("/api/notifications")
                        .param("userId", "2")
                        .param("read", "false")
                        .param("page", "1")
                        .param("size", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(10L))
                .andExpect(jsonPath("$.content[0].isRead").value(false))
                .andExpect(jsonPath("$.number").value(1))
                .andExpect(jsonPath("$.size").value(5));

        verify(notificationService).findPage(2L, false, 1, 5);
    }

    @Test
    @DisplayName("알림 상세 조회 성공")
    void getNotificationSuccess() throws Exception {
        when(notificationService.findById(1L)).thenReturn(detailResponse(1L));

        mockMvc.perform(get("/api/notifications/{id}", 1L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1L))
                .andExpect(jsonPath("$.title").value("업무요청 상태 변경"));

        verify(notificationService).findById(1L);
    }

    @Test
    @DisplayName("알림 생성 성공")
    void createNotificationSuccess() throws Exception {
        NotificationCreateRequest request = new NotificationCreateRequest(
                2L,
                "상태변경",
                "업무요청 상태 변경",
                "WR-001 상태가 변경되었습니다.",
                "WORK_REQUEST",
                11L,
                false
        );

        when(notificationService.create(eq(request))).thenReturn(50L);

        mockMvc.perform(post("/api/notifications")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(50L));

        verify(notificationService).create(eq(request));
    }

    @Test
    @DisplayName("알림 수정 성공 시 204를 반환한다")
    void updateNotificationSuccess() throws Exception {
        NotificationUpdateRequest request = new NotificationUpdateRequest(
                "배포완료",
                "배포 완료",
                "DP-001 배포가 완료되었습니다.",
                "DEPLOYMENT",
                77L,
                true,
                true
        );

        mockMvc.perform(put("/api/notifications/{id}", 50L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNoContent());

        verify(notificationService).update(eq(50L), eq(request));
    }

    @Test
    @DisplayName("알림 읽음 처리 시 기본값 true를 사용한다")
    void updateReadStateDefaultTrue() throws Exception {
        mockMvc.perform(patch("/api/notifications/{id}/read", 50L))
                .andExpect(status().isNoContent());

        verify(notificationService).updateReadState(50L, true);
    }

    @Test
    @DisplayName("알림 전체 읽음 처리 성공 시 204를 반환한다")
    void updateAllReadStateSuccess() throws Exception {
        TeamRequestContext.set(2L, 10L);

        mockMvc.perform(patch("/api/notifications/read-all"))
                .andExpect(status().isNoContent());

        verify(notificationService).updateAllReadState(2L, true);
    }

    @Test
    @DisplayName("알림 삭제 성공 시 204를 반환한다")
    void deleteNotificationSuccess() throws Exception {
        mockMvc.perform(delete("/api/notifications/{id}", 50L))
                .andExpect(status().isNoContent());

        verify(notificationService).delete(50L);
    }

    private NotificationListResponse listResponse(Long id) {
        return new NotificationListResponse(
                id,
                2L,
                "상태변경",
                "업무요청 상태 변경",
                "WR-001 상태가 변경되었습니다.",
                "WORK_REQUEST",
                11L,
                false,
                false,
                LocalDateTime.of(2026, 2, 25, 10, 0)
        );
    }

    private NotificationDetailResponse detailResponse(Long id) {
        return new NotificationDetailResponse(
                id,
                2L,
                "상태변경",
                "업무요청 상태 변경",
                "WR-001 상태가 변경되었습니다.",
                "WORK_REQUEST",
                11L,
                false,
                false,
                LocalDateTime.of(2026, 2, 25, 10, 0)
        );
    }
}
