package org.example.domain.flow.dto;

import java.util.List;

public record FlowChainResponse(
        List<FlowNode> nodes,
        List<FlowEdge> edges
) {
    public record FlowNode(
            String id,
            Long entityId,
            String nodeType,
            String docNo,
            String title,
            String status,
            String priority,
            String assigneeName,
            String version
    ) {}

    public record FlowEdge(
            String id,
            String source,
            String target
    ) {}
}
