package org.example.domain.dashboard.service;

import org.example.domain.dashboard.dto.DashboardResponse;

public interface DashboardService {

    DashboardResponse getDashboard(Long teamId, String scope, String domain, String authorizationHeader);
}
