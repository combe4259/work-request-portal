package org.example.domain.techTask.repository;

import org.example.domain.techTask.entity.TechTaskRelatedRef;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TechTaskRelatedRefRepository extends JpaRepository<TechTaskRelatedRef, Long> {
    List<TechTaskRelatedRef> findByTechTaskIdOrderByIdAsc(Long techTaskId);

    List<TechTaskRelatedRef> findByRefTypeAndRefId(String refType, Long refId);

    boolean existsByTechTaskIdAndRefTypeAndRefId(Long techTaskId, String refType, Long refId);

    void deleteByTechTaskId(Long techTaskId);
}
