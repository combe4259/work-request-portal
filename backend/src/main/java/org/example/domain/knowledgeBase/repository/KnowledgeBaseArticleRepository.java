package org.example.domain.knowledgeBase.repository;

import org.example.domain.knowledgeBase.entity.KnowledgeBaseArticle;
import org.springframework.data.jpa.repository.JpaRepository;

public interface KnowledgeBaseArticleRepository extends JpaRepository<KnowledgeBaseArticle, Long> {
}
