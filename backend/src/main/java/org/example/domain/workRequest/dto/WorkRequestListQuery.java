package org.example.domain.workRequest.dto;

import java.time.LocalDate;

public record WorkRequestListQuery(
        String q,
        String type,
        String priority,
        String status,
        Long assigneeId,
        LocalDate deadlineFrom,
        LocalDate deadlineTo,
        String sortBy,
        String sortDir
) {
}
