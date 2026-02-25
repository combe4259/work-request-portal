package org.example.domain.meetingNote.realtime;

import java.util.Map;

public record MeetingNotePatchMessage(
        String clientId,
        Map<String, Object> patch
) {
}
