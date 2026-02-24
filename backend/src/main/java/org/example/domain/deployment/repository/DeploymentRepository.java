package org.example.domain.deployment.repository;

import org.example.domain.deployment.entity.Deployment;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DeploymentRepository extends JpaRepository<Deployment, Long> {
}
