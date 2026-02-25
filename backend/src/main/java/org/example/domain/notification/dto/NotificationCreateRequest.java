package org.example.domain.notification.dto;

public record NotificationCreateRequest(
        Long userId,
        String type,
        String title,
        String message,
        String refType,
        Long refId,
        Boolean slackSent
) {
}
