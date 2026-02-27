package org.example.domain.knowledgeBase.repository;

import org.example.domain.knowledgeBase.entity.KnowledgeBaseArticle;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface KnowledgeBaseArticleRepository extends JpaRepository<KnowledgeBaseArticle, Long>, JpaSpecificationExecutor<KnowledgeBaseArticle> {

    Page<KnowledgeBaseArticle> findByTeamId(Long teamId, Pageable pageable);
}
