package org.example.domain.deployment.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record DeploymentDetailResponse(
        Long id,
        String deployNo,
        String title,
        String overview,
        String rollbackPlan,
        String version,
        String type,
        String environment,
        String status,
        Long teamId,
        Long managerId,
        LocalDate scheduledAt,
        LocalDateTime startedAt,
        LocalDateTime completedAt,
        LocalDateTime failedAt,
        LocalDateTime rolledBackAt,
        String statusNote,
        LocalDateTime deployedAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
