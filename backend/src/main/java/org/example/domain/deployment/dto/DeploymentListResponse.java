package org.example.domain.deployment.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record DeploymentListResponse(
        Long id,
        String deployNo,
        String title,
        String version,
        String type,
        String environment,
        String status,
        Long managerId,
        LocalDate scheduledAt,
        LocalDateTime createdAt
) {
}
