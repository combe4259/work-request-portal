package org.example.domain.defect.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record DefectUpdateRequest(
        String title,
        String description,
        String type,
        String severity,
        String status,
        String relatedRefType,
        Long relatedRefId,
        String environment,
        String reproductionSteps,
        String expectedBehavior,
        String actualBehavior,
        LocalDate deadline,
        String statusNote,
        Long assigneeId,
        LocalDateTime startedAt,
        LocalDateTime verifiedAt,
        LocalDateTime resolvedAt
) {
}
