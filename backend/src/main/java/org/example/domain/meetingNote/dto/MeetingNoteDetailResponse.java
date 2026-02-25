package org.example.domain.meetingNote.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record MeetingNoteDetailResponse(
        Long id,
        String noteNo,
        Long teamId,
        String title,
        LocalDate meetingDate,
        String location,
        Long facilitatorId,
        List<Long> attendeeIds,
        List<String> agenda,
        String content,
        List<String> decisions,
        Long createdBy,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
