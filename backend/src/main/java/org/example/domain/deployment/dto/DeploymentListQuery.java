package org.example.domain.deployment.dto;

import java.time.LocalDate;

public record DeploymentListQuery(
        String q,
        String type,
        String environment,
        String status,
        Long managerId,
        LocalDate scheduledFrom,
        LocalDate scheduledTo,
        String sortBy,
        String sortDir
) {
}
