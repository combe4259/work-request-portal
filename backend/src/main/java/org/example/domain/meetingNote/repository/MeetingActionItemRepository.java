package org.example.domain.meetingNote.repository;

import org.example.domain.meetingNote.entity.MeetingActionItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MeetingActionItemRepository extends JpaRepository<MeetingActionItem, Long> {
    List<MeetingActionItem> findByMeetingNoteIdOrderByIdAsc(Long meetingNoteId);

    Optional<MeetingActionItem> findByIdAndMeetingNoteId(Long id, Long meetingNoteId);

    void deleteByMeetingNoteId(Long meetingNoteId);

    long countByMeetingNoteId(Long meetingNoteId);

    long countByMeetingNoteIdAndStatus(Long meetingNoteId, String status);
}
