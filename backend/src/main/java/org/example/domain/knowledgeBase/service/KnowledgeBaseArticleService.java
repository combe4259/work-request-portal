package org.example.domain.knowledgeBase.service;

import org.example.domain.knowledgeBase.dto.KnowledgeBaseArticleCreateRequest;
import org.example.domain.knowledgeBase.dto.KnowledgeBaseArticleDetailResponse;
import org.example.domain.knowledgeBase.dto.KnowledgeBaseArticleListResponse;
import org.example.domain.knowledgeBase.dto.KnowledgeBaseArticleUpdateRequest;
import org.springframework.data.domain.Page;

public interface KnowledgeBaseArticleService {

    Page<KnowledgeBaseArticleListResponse> findPage(int page, int size);

    KnowledgeBaseArticleDetailResponse findById(Long id);

    Long create(KnowledgeBaseArticleCreateRequest request);

    void update(Long id, KnowledgeBaseArticleUpdateRequest request);

    void increaseViewCount(Long id);
}
