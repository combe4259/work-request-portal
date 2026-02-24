package org.example.domain.idea.dto;

import java.time.LocalDateTime;
import java.util.List;

public record ProjectIdeaDetailResponse(
        Long id,
        String ideaNo,
        Long teamId,
        String title,
        String content,
        List<String> benefits,
        String category,
        String status,
        String statusNote,
        Long proposedBy,
        long likeCount,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
