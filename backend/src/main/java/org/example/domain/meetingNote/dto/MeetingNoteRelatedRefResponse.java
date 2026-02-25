package org.example.domain.meetingNote.dto;

public record MeetingNoteRelatedRefResponse(
        String refType,
        Long refId,
        String refNo,
        String title
) {
}
