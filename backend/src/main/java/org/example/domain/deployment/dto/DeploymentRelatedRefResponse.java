package org.example.domain.deployment.dto;

public record DeploymentRelatedRefResponse(
        String refType,
        Long refId,
        String refNo,
        String title
) {
}
