package org.example.domain.resource.dto;

import java.time.LocalDateTime;

public record SharedResourceListResponse(
        Long id,
        String title,
        String url,
        String category,
        String description,
        Long registeredBy,
        LocalDateTime createdAt
) {
}
