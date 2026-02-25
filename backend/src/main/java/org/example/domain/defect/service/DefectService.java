package org.example.domain.defect.service;

import org.example.domain.defect.dto.DefectCreateRequest;
import org.example.domain.defect.dto.DefectDetailResponse;
import org.example.domain.defect.dto.DefectListResponse;
import org.example.domain.defect.dto.DefectStatusUpdateRequest;
import org.example.domain.defect.dto.DefectUpdateRequest;
import org.springframework.data.domain.Page;

public interface DefectService {
    Page<DefectListResponse> findPage(int page, int size);

    DefectDetailResponse findById(Long id);

    Long create(DefectCreateRequest request);

    void update(Long id, DefectUpdateRequest request);

    void delete(Long id);

    void updateStatus(Long id, DefectStatusUpdateRequest request);
}
