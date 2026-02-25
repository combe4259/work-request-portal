package org.example.domain.workRequest.repository;

import org.example.domain.workRequest.entity.WorkRequestRelatedRef;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WorkRequestRelatedRefRepository extends JpaRepository<WorkRequestRelatedRef, Long> {
    List<WorkRequestRelatedRef> findByWorkRequestIdOrderBySortOrderAscIdAsc(Long workRequestId);

    void deleteByWorkRequestId(Long workRequestId);
}
