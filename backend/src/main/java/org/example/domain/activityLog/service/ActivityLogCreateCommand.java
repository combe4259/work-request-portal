package org.example.domain.activityLog.service;

public record ActivityLogCreateCommand(
        Long teamId,
        String refType,
        Long refId,
        String actionType,
        Long actorId,
        String fieldName,
        String beforeValue,
        String afterValue,
        String message
) {
}
