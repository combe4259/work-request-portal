package org.example.domain.dashboard.controller;

import org.example.domain.dashboard.dto.DashboardResponse;
import org.example.domain.dashboard.service.DashboardService;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping
    public DashboardResponse getDashboard(
            @RequestParam(required = false) Long teamId,
            @RequestParam(defaultValue = "team") String scope,
            @RequestParam(defaultValue = "ALL") String domain,
            @RequestHeader(name = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader
    ) {
        return dashboardService.getDashboard(teamId, scope, domain, authorizationHeader);
    }
}
