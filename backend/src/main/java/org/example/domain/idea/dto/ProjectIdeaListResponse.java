package org.example.domain.idea.dto;

import java.time.LocalDateTime;

public record ProjectIdeaListResponse(
        Long id,
        String ideaNo,
        String title,
        String content,
        String category,
        String status,
        Long proposedBy,
        long likeCount,
        boolean likedByMe,
        long commentCount,
        LocalDateTime createdAt
) {
}
