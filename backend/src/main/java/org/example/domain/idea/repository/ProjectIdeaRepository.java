package org.example.domain.idea.repository;

import org.example.domain.idea.entity.ProjectIdea;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProjectIdeaRepository extends JpaRepository<ProjectIdea, Long> {
}
