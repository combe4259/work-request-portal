package org.example.domain.resource.dto;

public record SharedResourceCreateRequest(
        String title,
        String url,
        String category,
        String description,
        Long teamId,
        Long registeredBy
) {
}
