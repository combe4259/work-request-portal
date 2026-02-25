package org.example.domain.idea.dto;

public record ProjectIdeaRelatedRefItemRequest(
        String refType,
        Long refId,
        Integer sortOrder
) {
}
