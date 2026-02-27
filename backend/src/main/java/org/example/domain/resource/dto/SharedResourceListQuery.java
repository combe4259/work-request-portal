package org.example.domain.resource.dto;

public record SharedResourceListQuery(
        String q,
        String category,
        String sortBy,
        String sortDir
) {
}
