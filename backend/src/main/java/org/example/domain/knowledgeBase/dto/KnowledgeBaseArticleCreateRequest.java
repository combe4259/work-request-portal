package org.example.domain.knowledgeBase.dto;

import java.util.List;

public record KnowledgeBaseArticleCreateRequest(
        String title,
        String category,
        List<String> tags,
        String summary,
        String content,
        Long teamId,
        Long authorId
) {
}
