package org.example.domain.meetingNote.dto;

public record MeetingNoteRelatedRefItemRequest(
        String refType,
        Long refId,
        Integer sortOrder
) {
}
