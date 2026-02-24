package org.example.domain.techTask.dto;

public record TechTaskRelatedRefResponse(
        String refType,
        Long refId,
        String refNo,
        String title
) {
}
