package org.example.domain.workRequest.repository;

import org.example.domain.workRequest.entity.WorkRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface WorkRequestRepository extends JpaRepository<WorkRequest, Long>, JpaSpecificationExecutor<WorkRequest> {

    Page<WorkRequest> findByTeamId(Long teamId, Pageable pageable);

    @Query("SELECT e FROM WorkRequest e WHERE e.deadline = :date AND e.status NOT IN :excluded AND e.assigneeId IS NOT NULL")
    List<WorkRequest> findActiveByDeadline(@Param("date") LocalDate date, @Param("excluded") List<String> excluded);
}
