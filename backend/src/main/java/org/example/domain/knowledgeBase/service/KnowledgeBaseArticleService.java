package org.example.domain.knowledgeBase.service;

import org.example.domain.knowledgeBase.dto.KnowledgeBaseArticleCreateRequest;
import org.example.domain.knowledgeBase.dto.KnowledgeBaseArticleDetailResponse;
import org.example.domain.knowledgeBase.dto.KnowledgeBaseArticleListResponse;
import org.example.domain.knowledgeBase.dto.KnowledgeBaseRelatedRefResponse;
import org.example.domain.knowledgeBase.dto.KnowledgeBaseRelatedRefsUpdateRequest;
import org.example.domain.knowledgeBase.dto.KnowledgeBaseArticleUpdateRequest;
import org.springframework.data.domain.Page;

import java.util.List;

public interface KnowledgeBaseArticleService {

    Page<KnowledgeBaseArticleListResponse> findPage(int page, int size);

    KnowledgeBaseArticleDetailResponse findById(Long id);

    Long create(KnowledgeBaseArticleCreateRequest request);

    void update(Long id, KnowledgeBaseArticleUpdateRequest request);

    void delete(Long id);

    void increaseViewCount(Long id);

    List<KnowledgeBaseRelatedRefResponse> getRelatedRefs(Long id);

    void replaceRelatedRefs(Long id, KnowledgeBaseRelatedRefsUpdateRequest request);
}
