package org.example.domain.resource.dto;

import java.time.LocalDateTime;

public record SharedResourceDetailResponse(
        Long id,
        Long teamId,
        String title,
        String url,
        String category,
        String description,
        Long registeredBy,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
