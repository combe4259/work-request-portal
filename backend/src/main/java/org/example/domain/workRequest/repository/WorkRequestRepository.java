package org.example.domain.workRequest.repository;

import org.example.domain.workRequest.entity.WorkRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkRequestRepository extends JpaRepository<WorkRequest, Long> {

    Page<WorkRequest> findByTeamId(Long teamId, Pageable pageable);
}
