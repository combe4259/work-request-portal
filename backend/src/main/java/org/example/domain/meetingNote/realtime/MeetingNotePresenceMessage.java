package org.example.domain.meetingNote.realtime;

public record MeetingNotePresenceMessage(
        String clientId,
        String userName
) {
}
