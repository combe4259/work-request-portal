package org.example.domain.meetingNote.dto;

public record MeetingNoteListQuery(
        String q,
        String sortBy,
        String sortDir
) {
}
