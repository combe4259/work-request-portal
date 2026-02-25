package org.example.domain.workRequest.dto;

public record WorkRequestRelatedRefItemRequest(
        String refType,
        Long refId,
        Integer sortOrder
) {
}
