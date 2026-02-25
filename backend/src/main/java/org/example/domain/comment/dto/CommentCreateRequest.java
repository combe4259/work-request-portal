package org.example.domain.comment.dto;

public record CommentCreateRequest(
        String refType,
        Long refId,
        String content,
        Long authorId
) {
}
