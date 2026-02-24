package org.example.domain.techTask.repository;

import org.example.domain.techTask.entity.TechTaskRelatedRef;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TechTaskRelatedRefRepository extends JpaRepository<TechTaskRelatedRef, Long> {
    List<TechTaskRelatedRef> findByTechTaskIdOrderByIdAsc(Long techTaskId);

    void deleteByTechTaskId(Long techTaskId);
}
