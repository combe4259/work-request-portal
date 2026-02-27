package org.example.domain.deployment.repository;

import org.example.domain.deployment.entity.DeploymentRelatedRef;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DeploymentRelatedRefRepository extends JpaRepository<DeploymentRelatedRef, Long> {
    List<DeploymentRelatedRef> findByDeploymentIdOrderBySortOrderAscIdAsc(Long deploymentId);

    List<DeploymentRelatedRef> findByRefTypeAndRefId(String refType, Long refId);

    void deleteByDeploymentId(Long deploymentId);
}
