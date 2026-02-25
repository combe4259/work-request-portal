package org.example.domain.knowledgeBase.mapper;

import org.example.domain.knowledgeBase.dto.KnowledgeBaseArticleCreateRequest;
import org.example.domain.knowledgeBase.dto.KnowledgeBaseArticleDetailResponse;
import org.example.domain.knowledgeBase.dto.KnowledgeBaseArticleListResponse;
import org.example.domain.knowledgeBase.dto.KnowledgeBaseArticleUpdateRequest;
import org.example.domain.knowledgeBase.entity.KnowledgeBaseArticle;

import java.util.List;

public final class KnowledgeBaseArticleMapper {

    private KnowledgeBaseArticleMapper() {
    }

    public static KnowledgeBaseArticle fromCreateRequest(
            KnowledgeBaseArticleCreateRequest request,
            String tagsJson
    ) {
        KnowledgeBaseArticle entity = new KnowledgeBaseArticle();
        entity.setTitle(request.title());
        entity.setCategory(request.category());
        entity.setTags(tagsJson);
        entity.setSummary(request.summary());
        entity.setContent(request.content());
        entity.setTeamId(request.teamId());
        entity.setAuthorId(request.authorId());
        return entity;
    }

    public static void applyUpdate(
            KnowledgeBaseArticle entity,
            KnowledgeBaseArticleUpdateRequest request,
            String tagsJson
    ) {
        if (request.title() != null) {
            entity.setTitle(request.title());
        }
        if (request.category() != null) {
            entity.setCategory(request.category());
        }
        if (request.tags() != null) {
            entity.setTags(tagsJson);
        }
        if (request.summary() != null) {
            entity.setSummary(request.summary());
        }
        if (request.content() != null) {
            entity.setContent(request.content());
        }
    }

    public static KnowledgeBaseArticleListResponse toListResponse(
            KnowledgeBaseArticle entity,
            List<String> tags
    ) {
        return new KnowledgeBaseArticleListResponse(
                entity.getId(),
                entity.getArticleNo(),
                entity.getTitle(),
                entity.getCategory(),
                tags,
                entity.getSummary(),
                entity.getAuthorId(),
                entity.getViewCount(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    public static KnowledgeBaseArticleDetailResponse toDetailResponse(
            KnowledgeBaseArticle entity,
            List<String> tags
    ) {
        return new KnowledgeBaseArticleDetailResponse(
                entity.getId(),
                entity.getArticleNo(),
                entity.getTeamId(),
                entity.getTitle(),
                entity.getCategory(),
                tags,
                entity.getSummary(),
                entity.getContent(),
                entity.getAuthorId(),
                entity.getViewCount(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}
