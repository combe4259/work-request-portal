package org.example.domain.idea.dto;

public record ProjectIdeaRelatedRefResponse(
        String refType,
        Long refId,
        String refNo,
        String title
) {
}
