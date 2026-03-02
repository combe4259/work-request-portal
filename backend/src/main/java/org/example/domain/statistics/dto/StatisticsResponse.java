package org.example.domain.statistics.dto;

import java.util.List;

public record StatisticsResponse(
        Kpi kpi,
        List<BurndownItem> burndown,
        List<StatusSnapshotItem> statusSnapshot,
        List<DefectSeverityItem> defectSeverity,
        List<MemberStatItem> memberStats
) {

    public record Kpi(
            int incompleteCount,
            int overdueCount,
            int completedThisMonth,
            double averageProcessingDays
    ) {
    }

    public record BurndownItem(
            String date,
            int remaining
    ) {
    }

    public record StatusSnapshotItem(
            String name,
            int value
    ) {
    }

    public record DefectSeverityItem(
            String name,
            int count
    ) {
    }

    public record MemberStatItem(
            String name,
            int done,
            int inProgress
    ) {
    }
}
