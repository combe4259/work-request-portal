package org.example.domain.meetingNote.dto;

import java.time.LocalDate;

public record MeetingActionItemResponse(
        Long id,
        String content,
        Long assigneeId,
        LocalDate dueDate,
        String status,
        String linkedRefType,
        Long linkedRefId
) {
}
