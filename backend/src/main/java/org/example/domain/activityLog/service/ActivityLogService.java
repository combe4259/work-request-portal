package org.example.domain.activityLog.service;

import org.example.domain.activityLog.dto.ActivityLogListResponse;
import org.springframework.data.domain.Page;

public interface ActivityLogService {

    Page<ActivityLogListResponse> findPage(String refType, Long refId, int page, int size);

    void record(ActivityLogCreateCommand command);
}
