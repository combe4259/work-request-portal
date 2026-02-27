package org.example.domain.workRequest.repository;

import org.example.domain.workRequest.entity.WorkRequestRelatedRef;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WorkRequestRelatedRefRepository extends JpaRepository<WorkRequestRelatedRef, Long> {
    List<WorkRequestRelatedRef> findByWorkRequestIdOrderBySortOrderAscIdAsc(Long workRequestId);

    boolean existsByWorkRequestIdAndRefTypeAndRefId(Long workRequestId, String refType, Long refId);

    void deleteByWorkRequestId(Long workRequestId);
}
