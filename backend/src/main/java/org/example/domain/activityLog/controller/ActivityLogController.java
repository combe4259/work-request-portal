package org.example.domain.activityLog.controller;

import org.example.domain.activityLog.dto.ActivityLogListResponse;
import org.example.domain.activityLog.service.ActivityLogService;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/activity-logs")
public class ActivityLogController {

    private final ActivityLogService activityLogService;

    public ActivityLogController(ActivityLogService activityLogService) {
        this.activityLogService = activityLogService;
    }

    @GetMapping
    public Page<ActivityLogListResponse> getActivityLogs(
            @RequestParam String refType,
            @RequestParam Long refId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return activityLogService.findPage(refType, refId, page, size);
    }
}
