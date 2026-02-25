package org.example.domain.activityLog.dto;

import java.time.LocalDateTime;

public record ActivityLogListResponse(
        Long id,
        String refType,
        Long refId,
        String actionType,
        Long actorId,
        String fieldName,
        String beforeValue,
        String afterValue,
        String message,
        LocalDateTime createdAt
) {
}
