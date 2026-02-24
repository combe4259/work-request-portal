package org.example.domain.deployment.repository;

import org.example.domain.deployment.entity.DeploymentStep;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DeploymentStepRepository extends JpaRepository<DeploymentStep, Long> {
    List<DeploymentStep> findByDeploymentIdOrderByStepOrderAscIdAsc(Long deploymentId);

    Optional<DeploymentStep> findByIdAndDeploymentId(Long id, Long deploymentId);

    void deleteByDeploymentId(Long deploymentId);
}
