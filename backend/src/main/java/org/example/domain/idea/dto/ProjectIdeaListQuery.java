package org.example.domain.idea.dto;

public record ProjectIdeaListQuery(
        String q,
        String category,
        String status,
        String sortBy,
        String sortDir
) {
}
