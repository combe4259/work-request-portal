package org.example.domain.workRequest.service;

import org.example.domain.workRequest.dto.WorkRequestCreateRequest;
import org.example.domain.workRequest.dto.WorkRequestDetailResponse;
import org.example.domain.workRequest.dto.WorkRequestListResponse;
import org.example.domain.workRequest.dto.WorkRequestRelatedRefResponse;
import org.example.domain.workRequest.dto.WorkRequestRelatedRefsUpdateRequest;
import org.example.domain.workRequest.dto.WorkRequestUpdateRequest;
import org.springframework.data.domain.Page;

import java.util.List;

public interface WorkRequestService {
    Page<WorkRequestListResponse> findPage(int page, int size);

    WorkRequestDetailResponse findById(Long id);

    Long create(WorkRequestCreateRequest request);

    void update(Long id, WorkRequestUpdateRequest request);

    void delete(Long id);

    List<WorkRequestRelatedRefResponse> getRelatedRefs(Long id);

    void replaceRelatedRefs(Long id, WorkRequestRelatedRefsUpdateRequest request);
}
