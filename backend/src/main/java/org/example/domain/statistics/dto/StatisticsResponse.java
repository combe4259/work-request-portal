package org.example.domain.statistics.dto;

import java.util.List;

public record StatisticsResponse(
        Kpi kpi,
        List<WeeklyTrendItem> weeklyTrend,
        List<TypeDistributionItem> typeDistribution,
        List<DefectSeverityItem> defectSeverity,
        List<MemberStatItem> memberStats,
        List<StatusFlowItem> statusFlow
) {

    public record Kpi(
            int totalRequests,
            double averageProcessingDays,
            int completionRate,
            int unresolvedDefects
    ) {
    }

    public record WeeklyTrendItem(
            String week,
            int wr,
            int defect,
            int deploy
    ) {
    }

    public record TypeDistributionItem(
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

    public record StatusFlowItem(
            String name,
            int value
    ) {
    }
}
