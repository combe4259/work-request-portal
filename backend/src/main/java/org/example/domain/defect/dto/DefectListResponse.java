package org.example.domain.defect.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record DefectListResponse(
        Long id,
        String defectNo,
        String title,
        String type,
        String severity,
        String status,
        Long reporterId,
        Long assigneeId,
        String relatedRefType,
        Long relatedRefId,
        LocalDate deadline,
        LocalDateTime createdAt
) {
}
