package org.example.domain.statistics.service;

import org.example.domain.statistics.dto.StatisticsResponse;

public interface StatisticsService {

    StatisticsResponse getStatistics(Long teamId);
}
