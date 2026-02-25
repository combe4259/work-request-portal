package org.example.domain.meetingNote.repository;

import org.example.domain.meetingNote.entity.MeetingAttendee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MeetingAttendeeRepository extends JpaRepository<MeetingAttendee, Long> {
    List<MeetingAttendee> findByMeetingNoteIdOrderByIdAsc(Long meetingNoteId);

    void deleteByMeetingNoteId(Long meetingNoteId);

    @Modifying
    @Query(
            value = "insert ignore into meeting_attendees (meeting_note_id, user_id, attended) values (:meetingNoteId, :userId, true)",
            nativeQuery = true
    )
    void insertIgnore(@Param("meetingNoteId") Long meetingNoteId, @Param("userId") Long userId);
}
