package org.example.domain.workRequest.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record WorkRequestListResponse(
        Long id,
        String requestNo,
        String title,
        String type,
        String priority,
        String status,
        Long assigneeId,
        LocalDate deadline,
        LocalDateTime createdAt
) {
}
