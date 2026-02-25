package org.example.domain.resource.dto;

public record SharedResourceUpdateRequest(
        String title,
        String url,
        String category,
        String description
) {
}
