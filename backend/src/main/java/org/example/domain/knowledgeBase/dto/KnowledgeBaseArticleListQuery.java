package org.example.domain.knowledgeBase.dto;

import java.util.List;

public record KnowledgeBaseArticleListQuery(
        String q,
        String category,
        List<String> tags,
        String sortBy,
        String sortDir
) {
}
