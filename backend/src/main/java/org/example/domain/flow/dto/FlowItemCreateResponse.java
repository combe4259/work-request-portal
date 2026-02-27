package org.example.domain.flow.dto;

public record FlowItemCreateResponse(
        String nodeId,
        Long entityId,
        String nodeType,
        String docNo,
        String title,
        String status,
        String edgeId,
        String edgeSource,
        String edgeTarget
) {}
