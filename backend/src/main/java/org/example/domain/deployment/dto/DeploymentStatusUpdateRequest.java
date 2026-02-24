package org.example.domain.deployment.dto;

public record DeploymentStatusUpdateRequest(
        String status,
        String statusNote
) {
}
