package org.example.domain.knowledgeBase.dto;

public record KnowledgeBaseRelatedRefResponse(
        String refType,
        Long refId,
        String refNo,
        String title
) {
}
