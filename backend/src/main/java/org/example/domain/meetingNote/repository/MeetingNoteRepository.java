package org.example.domain.meetingNote.repository;

import jakarta.persistence.LockModeType;
import org.example.domain.meetingNote.entity.MeetingNote;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface MeetingNoteRepository extends JpaRepository<MeetingNote, Long> {

    Page<MeetingNote> findByTeamId(Long teamId, Pageable pageable);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select m from MeetingNote m where m.id = :id")
    Optional<MeetingNote> findByIdForUpdate(@Param("id") Long id);
}
