package org.example.domain.knowledgeBase.dto;

public record KnowledgeBaseRelatedRefItemRequest(
        String refType,
        Long refId,
        Integer sortOrder
) {
}
