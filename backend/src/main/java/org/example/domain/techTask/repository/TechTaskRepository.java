package org.example.domain.techTask.repository;

import org.example.domain.techTask.entity.TechTask;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TechTaskRepository extends JpaRepository<TechTask, Long> {
}
