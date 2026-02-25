package org.example.domain.statistics.controller;

import org.example.domain.statistics.dto.StatisticsResponse;
import org.example.domain.statistics.service.StatisticsService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(StatisticsController.class)
class StatisticsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private StatisticsService statisticsService;

    @Test
    @DisplayName("통계 조회는 teamId 파라미터를 전달해 응답한다")
    void getStatistics() throws Exception {
        StatisticsResponse response = new StatisticsResponse(
                new StatisticsResponse.Kpi(87, 4.2, 78, 16),
                List.of(new StatisticsResponse.WeeklyTrendItem("2/17주", 10, 2, 1)),
                List.of(new StatisticsResponse.TypeDistributionItem("기능개선", 35)),
                List.of(new StatisticsResponse.DefectSeverityItem("높음", 12)),
                List.of(new StatisticsResponse.MemberStatItem("김개발", 18, 3)),
                List.of(new StatisticsResponse.StatusFlowItem("개발중", 34))
        );

        when(statisticsService.getStatistics(10L)).thenReturn(response);

        mockMvc.perform(get("/api/statistics").param("teamId", "10").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.kpi.totalRequests").value(87))
                .andExpect(jsonPath("$.weeklyTrend[0].wr").value(10))
                .andExpect(jsonPath("$.typeDistribution[0].name").value("기능개선"));

        verify(statisticsService).getStatistics(10L);
    }
}
