package org.example.domain.knowledgeBase.dto;

import java.time.LocalDateTime;
import java.util.List;

public record KnowledgeBaseArticleListResponse(
        Long id,
        String articleNo,
        String title,
        String category,
        List<String> tags,
        String summary,
        Long authorId,
        Integer viewCount,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
