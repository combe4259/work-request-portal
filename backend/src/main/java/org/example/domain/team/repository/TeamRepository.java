package org.example.domain.team.repository;

import org.example.domain.team.entity.Team;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TeamRepository extends JpaRepository<Team, Long> {
    boolean existsByInviteCode(String inviteCode);
}
