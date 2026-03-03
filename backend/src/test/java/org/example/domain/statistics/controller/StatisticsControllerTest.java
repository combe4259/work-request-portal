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
                new StatisticsResponse.Kpi(5, 2, 10, 3.5),
                List.of(new StatisticsResponse.BurndownItem("3/3", 5)),
                List.of(new StatisticsResponse.StatusSnapshotItem("개발중", 3)),
                List.of(new StatisticsResponse.DefectSeverityItem("높음", 12)),
                List.of(new StatisticsResponse.MemberStatItem("김개발", 4, 2))
        );

        when(statisticsService.getStatistics(10L, 30)).thenReturn(response);

        mockMvc.perform(get("/api/statistics").param("teamId", "10").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.kpi.incompleteCount").value(5))
                .andExpect(jsonPath("$.burndown[0].date").value("3/3"))
                .andExpect(jsonPath("$.statusSnapshot[0].name").value("개발중"));

        verify(statisticsService).getStatistics(10L, 30);
    }
}
