package org.example.domain.notification.dto;

public record NotificationUnreadCountsResponse(
        long total,
        long workRequest,
        long testScenario,
        long defect
) {
}
