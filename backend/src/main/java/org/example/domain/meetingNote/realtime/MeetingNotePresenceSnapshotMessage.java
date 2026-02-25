package org.example.domain.meetingNote.realtime;

import java.util.List;

public record MeetingNotePresenceSnapshotMessage(
        String type,
        List<MeetingNotePresenceUser> editors
) {
    public record MeetingNotePresenceUser(
            String clientId,
            String userName
    ) {
    }
}
