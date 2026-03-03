package org.example.domain.deployment.repository;

import org.example.domain.deployment.entity.Deployment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface DeploymentRepository extends JpaRepository<Deployment, Long>, JpaSpecificationExecutor<Deployment> {

    Page<Deployment> findByTeamId(Long teamId, Pageable pageable);

    @Query("SELECT e FROM Deployment e WHERE e.scheduledAt = :date AND e.status NOT IN :excluded")
    List<Deployment> findActiveByScheduledAt(@Param("date") LocalDate date, @Param("excluded") List<String> excluded);
}
