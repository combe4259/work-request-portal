package org.example.domain.defect.repository;

import org.example.domain.defect.entity.Defect;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface DefectRepository extends JpaRepository<Defect, Long>, JpaSpecificationExecutor<Defect> {

    Page<Defect> findByTeamId(Long teamId, Pageable pageable);

    List<Defect> findByRelatedRefTypeAndRelatedRefId(String relatedRefType, Long relatedRefId);

    @Query("SELECT e FROM Defect e WHERE e.deadline = :date AND e.status NOT IN :excluded AND e.assigneeId IS NOT NULL")
    List<Defect> findActiveByDeadline(@Param("date") LocalDate date, @Param("excluded") List<String> excluded);
}
