package org.example.domain.dashboard.dto;

import java.time.LocalDate;
import java.util.List;

public record DashboardResponse(
        KpiSummary kpi,
        List<DashboardWorkItem> workRequests,
        int totalWorkItems,
        List<DashboardCalendarEvent> calendarEvents
) {

    public record KpiSummary(
            int todoCount,
            int inProgressCount,
            int doneCount,
            int urgentCount
    ) {
    }

    public record DashboardWorkItem(
            Long id,
            String domain,
            String docNo,
            String title,
            String type,
            String priority,
            String status,
            String assignee,
            LocalDate deadline
    ) {
    }

    public record DashboardCalendarEvent(
            Long id,
            String startDate,
            String endDate,
            String domain,
            String docNo,
            String title,
            String priority
    ) {
    }
}
