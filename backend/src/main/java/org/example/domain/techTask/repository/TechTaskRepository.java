package org.example.domain.techTask.repository;

import org.example.domain.techTask.entity.TechTask;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface TechTaskRepository extends JpaRepository<TechTask, Long>, JpaSpecificationExecutor<TechTask> {

    Page<TechTask> findByTeamId(Long teamId, Pageable pageable);

    Optional<TechTask> findByTaskNo(String taskNo);

    @Query("SELECT e FROM TechTask e WHERE e.deadline = :date AND e.status NOT IN :excluded AND e.assigneeId IS NOT NULL")
    List<TechTask> findActiveByDeadline(@Param("date") LocalDate date, @Param("excluded") List<String> excluded);
}
