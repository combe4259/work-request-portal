package org.example.domain.meetingNote.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record MeetingNoteListResponse(
        Long id,
        String noteNo,
        String title,
        LocalDate meetingDate,
        Long facilitatorId,
        long actionTotal,
        long actionDone,
        LocalDateTime createdAt
) {
}
