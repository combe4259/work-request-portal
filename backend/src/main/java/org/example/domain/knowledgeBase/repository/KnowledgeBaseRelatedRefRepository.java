package org.example.domain.knowledgeBase.repository;

import org.example.domain.knowledgeBase.entity.KnowledgeBaseRelatedRef;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface KnowledgeBaseRelatedRefRepository extends JpaRepository<KnowledgeBaseRelatedRef, Long> {
    List<KnowledgeBaseRelatedRef> findByArticleIdOrderBySortOrderAscIdAsc(Long articleId);

    void deleteByArticleId(Long articleId);
}
