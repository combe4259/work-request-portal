package org.example.domain.flow.dto;

import java.util.List;
import java.util.Map;

public record FlowUiStateResponse(
        Long version,
        Map<String, FlowUiPosition> positions,
        List<FlowUiEdge> edges,
        List<FlowUiCustomNode> customNodes
) {
    public static FlowUiStateResponse empty() {
        return new FlowUiStateResponse(0L, Map.of(), List.of(), List.of());
    }

    public record FlowUiPosition(
            double x,
            double y
    ) {
    }

    public record FlowUiEdge(
            String id,
            String source,
            String target
    ) {
    }

    public record FlowUiCustomNode(
            String id,
            Long entityId,
            String nodeType,
            String docNo,
            String title,
            String status,
            String priority,
            String assigneeName,
            String version
    ) {
    }
}
