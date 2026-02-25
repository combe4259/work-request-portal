package org.example.domain.meetingNote.repository;

import org.example.domain.meetingNote.entity.MeetingNote;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MeetingNoteRepository extends JpaRepository<MeetingNote, Long> {

    Page<MeetingNote> findByTeamId(Long teamId, Pageable pageable);
}
