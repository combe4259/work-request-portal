package org.example.domain.knowledgeBase.dto;

import java.time.LocalDateTime;
import java.util.List;

public record KnowledgeBaseArticleDetailResponse(
        Long id,
        String articleNo,
        Long teamId,
        String title,
        String category,
        List<String> tags,
        String summary,
        String content,
        Long authorId,
        Integer viewCount,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
