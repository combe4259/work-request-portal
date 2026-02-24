package org.example.domain.techTask.dto;

public record TechTaskRelatedRefItemRequest(
        String refType,
        Long refId,
        Integer sortOrder
) {
}
