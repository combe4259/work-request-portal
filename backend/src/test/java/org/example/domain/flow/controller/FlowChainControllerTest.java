package org.example.domain.flow.controller;

import org.example.domain.flow.dto.FlowChainResponse;
import org.example.domain.flow.dto.FlowItemCreateResponse;
import org.example.domain.flow.dto.FlowUiStateResponse;
import org.example.domain.flow.service.FlowChainService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(FlowChainController.class)
class FlowChainControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private FlowChainService flowChainService;

    @Test
    @DisplayName("워크플로우 체인 조회 API는 노드/엣지를 반환한다")
    void getFlowChain() throws Exception {
        FlowChainResponse response = new FlowChainResponse(
                List.of(
                        new FlowChainResponse.FlowNode("WR-15", 15L, "WORK_REQUEST", "WR-015", "업무요청", "요청", "보통", "홍길동", null),
                        new FlowChainResponse.FlowNode("TT-1", 1L, "TECH_TASK", "TK-001", "기술과제", "접수대기", "보통", "김개발", null)
                ),
                List.of(new FlowChainResponse.FlowEdge("edge-WR-15-TT-1", "WR-15", "TT-1"))
        );
        when(flowChainService.getFlowChain(15L)).thenReturn(response);

        mockMvc.perform(get("/api/work-requests/15/flow-chain")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nodes[0].id").value("WR-15"))
                .andExpect(jsonPath("$.edges[0].source").value("WR-15"));

        verify(flowChainService).getFlowChain(15L);
    }

    @Test
    @DisplayName("워크플로우 카드 생성 API는 생성 결과를 반환한다")
    void createFlowItem() throws Exception {
        FlowItemCreateResponse response = new FlowItemCreateResponse(
                "TT-31", 31L, "TECH_TASK", "TK-031", "신규 기술과제", "접수대기",
                "edge-WR-15-TT-31", "WR-15", "TT-31"
        );
        when(flowChainService.createFlowItem(eq(15L), any())).thenReturn(response);

        mockMvc.perform(post("/api/work-requests/15/flow-items")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "parentType": "WORK_REQUEST",
                                  "parentId": 15,
                                  "itemType": "TECH_TASK",
                                  "title": "신규 기술과제"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nodeId").value("TT-31"))
                .andExpect(jsonPath("$.nodeType").value("TECH_TASK"));

        verify(flowChainService).createFlowItem(eq(15L), any());
    }

    @Test
    @DisplayName("워크플로우 UI 상태 조회 API는 version을 포함해 반환한다")
    void getFlowUiState() throws Exception {
        FlowUiStateResponse response = new FlowUiStateResponse(
                4L,
                Map.of("WR-15", new FlowUiStateResponse.FlowUiPosition(120.5, 88.0)),
                List.of(new FlowUiStateResponse.FlowUiEdge("edge-WR-15-TT-1", "WR-15", "TT-1")),
                List.of()
        );
        when(flowChainService.getFlowUiState(15L)).thenReturn(response);

        mockMvc.perform(get("/api/work-requests/15/flow-ui")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.version").value(4))
                .andExpect(jsonPath("$.positions.WR-15.x").value(120.5));

        verify(flowChainService).getFlowUiState(15L);
    }

    @Test
    @DisplayName("워크플로우 UI 상태 저장 API는 expectedVersion을 받아 204를 반환한다")
    void saveFlowUiState() throws Exception {
        mockMvc.perform(put("/api/work-requests/15/flow-ui")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "expectedVersion": 4,
                                  "positions": {
                                    "WR-15": {"x": 100, "y": 200}
                                  },
                                  "edges": [],
                                  "customNodes": []
                                }
                                """))
                .andExpect(status().isNoContent());

        verify(flowChainService).saveFlowUiState(eq(15L), any());
    }
}
