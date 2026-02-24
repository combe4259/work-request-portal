package org.example.domain.deployment.dto;

import java.time.LocalDateTime;

public record DeploymentStepResponse(
        Long id,
        Integer stepOrder,
        String content,
        Boolean isDone,
        LocalDateTime completedAt
) {
}
