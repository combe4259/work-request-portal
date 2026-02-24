package org.example.domain.meetingNote.dto;

import java.time.LocalDate;

public record MeetingActionItemItemRequest(
        String content,
        Long assigneeId,
        LocalDate dueDate,
        String status,
        String linkedRefType,
        Long linkedRefId
) {
}
