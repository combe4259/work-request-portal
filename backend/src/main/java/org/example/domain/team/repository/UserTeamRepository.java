package org.example.domain.team.repository;

import org.example.domain.team.entity.UserTeam;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserTeamRepository extends JpaRepository<UserTeam, Long> {
    List<UserTeam> findByUserId(Long userId);

    List<UserTeam> findByTeamId(Long teamId);

    boolean existsByUserIdAndTeamId(Long userId, Long teamId);

    Optional<UserTeam> findByUserIdAndTeamId(Long userId, Long teamId);

    void deleteByUserIdAndTeamId(Long userId, Long teamId);
}
