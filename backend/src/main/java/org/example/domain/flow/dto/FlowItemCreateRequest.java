package org.example.domain.flow.dto;

public record FlowItemCreateRequest(
        String parentType,
        Long parentId,
        String itemType,
        String title
) {}
