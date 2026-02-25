package org.example.domain.notification.dto;

public record NotificationUpdateRequest(
        String type,
        String title,
        String message,
        String refType,
        Long refId,
        Boolean isRead,
        Boolean slackSent
) {
}
