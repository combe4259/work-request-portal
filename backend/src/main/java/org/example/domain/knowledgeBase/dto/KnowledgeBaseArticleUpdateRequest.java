package org.example.domain.knowledgeBase.dto;

import java.util.List;

public record KnowledgeBaseArticleUpdateRequest(
        String title,
        String category,
        List<String> tags,
        String summary,
        String content
) {
}
