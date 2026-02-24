package org.example.domain.idea.repository;

import org.example.domain.idea.entity.IdeaVote;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IdeaVoteRepository extends JpaRepository<IdeaVote, Long> {
    boolean existsByIdeaIdAndUserId(Long ideaId, Long userId);

    long countByIdeaId(Long ideaId);

    long deleteByIdeaIdAndUserId(Long ideaId, Long userId);
}
