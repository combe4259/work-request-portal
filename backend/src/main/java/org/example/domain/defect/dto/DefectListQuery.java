package org.example.domain.defect.dto;

import java.time.LocalDate;

public record DefectListQuery(
        String q,
        String type,
        String severity,
        String status,
        Long assigneeId,
        LocalDate deadlineFrom,
        LocalDate deadlineTo,
        String sortBy,
        String sortDir
) {
}
