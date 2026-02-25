package org.example.domain.dashboard.controller;

import org.example.domain.dashboard.dto.DashboardResponse;
import org.example.domain.dashboard.service.DashboardService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(DashboardController.class)
class DashboardControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private DashboardService dashboardService;

    @Test
    @DisplayName("대시보드 조회는 teamId 파라미터를 전달해 응답한다")
    void getDashboard() throws Exception {
        DashboardResponse response = new DashboardResponse(
                new DashboardResponse.KpiSummary(3, 2, 1, 1),
                List.of(new DashboardResponse.DashboardWorkItem(
                        1L,
                        "WR-001",
                        "업무요청",
                        "기능개선",
                        "높음",
                        "개발중",
                        "김개발",
                        LocalDate.of(2026, 3, 3)
                )),
                List.of(new DashboardResponse.DashboardCalendarEvent(
                        "2026-03-03",
                        3,
                        "WR-001",
                        "업무요청",
                        "높음"
                ))
        );

        when(dashboardService.getDashboard(10L)).thenReturn(response);

        mockMvc.perform(get("/api/dashboard").param("teamId", "10").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.kpi.todoCount").value(3))
                .andExpect(jsonPath("$.workRequests[0].docNo").value("WR-001"))
                .andExpect(jsonPath("$.calendarEvents[0].day").value(3));

        verify(dashboardService).getDashboard(10L);
    }
}
