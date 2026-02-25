package org.example.domain.notification.dto;

import java.time.LocalDateTime;

public record NotificationDetailResponse(
        Long id,
        Long userId,
        String type,
        String title,
        String message,
        String refType,
        Long refId,
        Boolean isRead,
        Boolean slackSent,
        LocalDateTime createdAt
) {
}
