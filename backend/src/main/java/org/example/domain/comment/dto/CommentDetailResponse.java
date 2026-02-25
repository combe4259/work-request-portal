package org.example.domain.comment.dto;

import java.time.LocalDateTime;

public record CommentDetailResponse(
        Long id,
        String refType,
        Long refId,
        String content,
        Long authorId,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
