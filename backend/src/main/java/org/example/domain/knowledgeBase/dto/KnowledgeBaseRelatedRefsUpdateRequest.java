package org.example.domain.knowledgeBase.dto;

import java.util.List;

public record KnowledgeBaseRelatedRefsUpdateRequest(
        List<KnowledgeBaseRelatedRefItemRequest> items
) {
}
