package org.example.domain.defect.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record DefectDetailResponse(
        Long id,
        String defectNo,
        String title,
        String description,
        String type,
        String severity,
        String status,
        Long teamId,
        String relatedRefType,
        Long relatedRefId,
        String environment,
        String reproductionSteps,
        String expectedBehavior,
        String actualBehavior,
        LocalDate deadline,
        String statusNote,
        Long reporterId,
        Long assigneeId,
        LocalDateTime startedAt,
        LocalDateTime verifiedAt,
        LocalDateTime resolvedAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
