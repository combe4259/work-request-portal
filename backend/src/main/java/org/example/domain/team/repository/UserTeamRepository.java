package org.example.domain.team.repository;

import org.example.domain.team.entity.UserTeam;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserTeamRepository extends JpaRepository<UserTeam, Long> {
    List<UserTeam> findByUserId(Long userId);
}
