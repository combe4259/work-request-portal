package org.example.domain.notification.dto;

public record NotificationUnreadCountsResponse(
        long total,
        long workRequest,
        long techTask,
        long testScenario,
        long defect,
        long deployment,
        long idea
) {
}
