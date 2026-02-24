package org.example.domain.workRequest.repository;

import org.example.domain.workRequest.entity.WorkRequest;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkRequestRepository extends JpaRepository<WorkRequest, Long> {
}
