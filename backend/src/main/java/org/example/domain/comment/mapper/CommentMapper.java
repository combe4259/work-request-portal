package org.example.domain.comment.mapper;

import org.example.domain.comment.dto.CommentCreateRequest;
import org.example.domain.comment.dto.CommentDetailResponse;
import org.example.domain.comment.dto.CommentListResponse;
import org.example.domain.comment.dto.CommentUpdateRequest;
import org.example.domain.comment.entity.Comment;

public final class CommentMapper {

    private CommentMapper() {
    }

    public static Comment fromCreateRequest(CommentCreateRequest request) {
        Comment entity = new Comment();
        entity.setRefType(request.refType());
        entity.setRefId(request.refId());
        entity.setContent(request.content());
        entity.setAuthorId(request.authorId());
        return entity;
    }

    public static void applyUpdate(Comment entity, CommentUpdateRequest request) {
        if (request.content() != null) {
            entity.setContent(request.content());
        }
    }

    public static CommentListResponse toListResponse(Comment entity) {
        return new CommentListResponse(
                entity.getId(),
                entity.getRefType(),
                entity.getRefId(),
                entity.getContent(),
                entity.getAuthorId(),
                entity.getCreatedAt()
        );
    }

    public static CommentDetailResponse toDetailResponse(Comment entity) {
        return new CommentDetailResponse(
                entity.getId(),
                entity.getRefType(),
                entity.getRefId(),
                entity.getContent(),
                entity.getAuthorId(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}
