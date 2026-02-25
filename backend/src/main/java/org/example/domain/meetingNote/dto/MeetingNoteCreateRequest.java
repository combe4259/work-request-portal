package org.example.domain.meetingNote.dto;

import java.time.LocalDate;
import java.util.List;

public record MeetingNoteCreateRequest(
        String title,
        LocalDate meetingDate,
        String location,
        Long facilitatorId,
        List<String> agenda,
        String content,
        List<String> decisions,
        Long teamId,
        Long createdBy,
        List<Long> attendeeIds,
        List<MeetingActionItemItemRequest> actionItems,
        List<MeetingNoteRelatedRefItemRequest> relatedRefs
) {
}
