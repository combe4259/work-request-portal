package org.example.domain.knowledgeBase.repository;

import org.example.domain.knowledgeBase.entity.KnowledgeBaseRelatedRef;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface KnowledgeBaseRelatedRefRepository extends JpaRepository<KnowledgeBaseRelatedRef, Long> {
    List<KnowledgeBaseRelatedRef> findByArticleIdOrderBySortOrderAscIdAsc(Long articleId);
    List<KnowledgeBaseRelatedRef> findByRefTypeAndRefId(String refType, Long refId);

    boolean existsByArticleIdAndRefTypeAndRefId(Long articleId, String refType, Long refId);

    void deleteByArticleIdAndRefTypeAndRefId(Long articleId, String refType, Long refId);

    void deleteByRefTypeAndRefId(String refType, Long refId);

    void deleteByArticleId(Long articleId);
}
