package org.example.domain.resource.service;

import org.example.domain.resource.dto.SharedResourceCreateRequest;
import org.example.domain.resource.dto.SharedResourceDetailResponse;
import org.example.domain.resource.dto.SharedResourceListResponse;
import org.example.domain.resource.dto.SharedResourceUpdateRequest;
import org.springframework.data.domain.Page;

public interface SharedResourceService {

    Page<SharedResourceListResponse> findPage(int page, int size);

    SharedResourceDetailResponse findById(Long id);

    Long create(SharedResourceCreateRequest request);

    void update(Long id, SharedResourceUpdateRequest request);

    void delete(Long id);
}
