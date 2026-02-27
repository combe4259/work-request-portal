package org.example.domain.flow.controller;

import org.example.domain.flow.dto.FlowChainResponse;
import org.example.domain.flow.dto.FlowItemCreateRequest;
import org.example.domain.flow.dto.FlowItemCreateResponse;
import org.example.domain.flow.dto.FlowUiStateRequest;
import org.example.domain.flow.dto.FlowUiStateResponse;
import org.example.domain.flow.service.FlowChainService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/work-requests/{workRequestId}")
public class FlowChainController {

    private final FlowChainService flowChainService;

    public FlowChainController(FlowChainService flowChainService) {
        this.flowChainService = flowChainService;
    }

    @GetMapping("/flow-chain")
    public ResponseEntity<FlowChainResponse> getFlowChain(@PathVariable Long workRequestId) {
        return ResponseEntity.ok(flowChainService.getFlowChain(workRequestId));
    }

    @PostMapping("/flow-items")
    public ResponseEntity<FlowItemCreateResponse> createFlowItem(
            @PathVariable Long workRequestId,
            @RequestBody FlowItemCreateRequest request
    ) {
        return ResponseEntity.ok(flowChainService.createFlowItem(workRequestId, request));
    }

    @GetMapping("/flow-ui")
    public ResponseEntity<FlowUiStateResponse> getFlowUiState(@PathVariable Long workRequestId) {
        return ResponseEntity.ok(flowChainService.getFlowUiState(workRequestId));
    }

    @PutMapping("/flow-ui")
    public ResponseEntity<Void> saveFlowUiState(
            @PathVariable Long workRequestId,
            @RequestBody FlowUiStateRequest request
    ) {
        flowChainService.saveFlowUiState(workRequestId, request);
        return ResponseEntity.noContent().build();
    }
}
