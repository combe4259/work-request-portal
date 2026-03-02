package org.example.domain.deployment.repository;

import org.example.domain.deployment.entity.DeploymentStep;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface DeploymentStepRepository extends JpaRepository<DeploymentStep, Long> {
    List<DeploymentStep> findByDeploymentIdOrderByStepOrderAscIdAsc(Long deploymentId);

    Optional<DeploymentStep> findByIdAndDeploymentId(Long id, Long deploymentId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("DELETE FROM DeploymentStep s WHERE s.deploymentId = :deploymentId")
    void deleteByDeploymentId(Long deploymentId);
}
