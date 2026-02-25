package org.example.domain.idea.repository;

import org.example.domain.idea.entity.ProjectIdeaRelatedRef;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProjectIdeaRelatedRefRepository extends JpaRepository<ProjectIdeaRelatedRef, Long> {
    List<ProjectIdeaRelatedRef> findByProjectIdeaIdOrderBySortOrderAscIdAsc(Long projectIdeaId);

    void deleteByProjectIdeaId(Long projectIdeaId);
}
