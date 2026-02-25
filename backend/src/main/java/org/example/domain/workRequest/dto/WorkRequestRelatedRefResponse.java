package org.example.domain.workRequest.dto;

public record WorkRequestRelatedRefResponse(
        String refType,
        Long refId,
        String refNo,
        String title
) {
}
