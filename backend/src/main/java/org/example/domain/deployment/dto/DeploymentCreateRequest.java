package org.example.domain.deployment.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record DeploymentCreateRequest(
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
        List<DeploymentRelatedRefItemRequest> relatedRefs,
        List<String> steps
) {
}
