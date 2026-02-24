package org.example.domain.techTask.repository;

import org.example.domain.techTask.entity.TechTaskPrLink;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TechTaskPrLinkRepository extends JpaRepository<TechTaskPrLink, Long> {
    List<TechTaskPrLink> findByTechTaskIdOrderByIdAsc(Long techTaskId);

    Optional<TechTaskPrLink> findByIdAndTechTaskId(Long id, Long techTaskId);
}
