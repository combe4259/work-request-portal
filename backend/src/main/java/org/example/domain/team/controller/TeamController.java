package org.example.domain.team.controller;

import jakarta.validation.Valid;
import org.example.domain.team.dto.TeamCreateRequest;
import org.example.domain.team.dto.TeamJoinRequest;
import org.example.domain.team.dto.TeamMemberResponse;
import org.example.domain.team.dto.TeamMemberRoleUpdateRequest;
import org.example.domain.team.dto.TeamResponse;
import org.example.domain.team.service.TeamService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/teams")
public class TeamController {

    private final TeamService teamService;

    public TeamController(TeamService teamService) {
        this.teamService = teamService;
    }

    @GetMapping("/mine")
    public ResponseEntity<List<TeamResponse>> getMyTeams(
            @RequestHeader(name = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader
    ) {
        return ResponseEntity.ok(teamService.getMyTeams(authorizationHeader));
    }

    @PostMapping
    public ResponseEntity<TeamResponse> createTeam(
            @RequestHeader(name = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
            @Valid @RequestBody TeamCreateRequest request
    ) {
        return ResponseEntity.ok(teamService.createTeam(authorizationHeader, request));
    }

    @PostMapping("/join")
    public ResponseEntity<TeamResponse> joinTeam(
            @RequestHeader(name = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
            @Valid @RequestBody TeamJoinRequest request
    ) {
        return ResponseEntity.ok(teamService.joinTeam(authorizationHeader, request));
    }

    @GetMapping("/{teamId}/members")
    public ResponseEntity<List<TeamMemberResponse>> getTeamMembers(
            @RequestHeader(name = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
            @PathVariable Long teamId
    ) {
        return ResponseEntity.ok(teamService.getTeamMembers(authorizationHeader, teamId));
    }

    @PatchMapping("/{teamId}/members/{userId}/role")
    public ResponseEntity<Void> updateTeamMemberRole(
            @RequestHeader(name = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
            @PathVariable Long teamId,
            @PathVariable Long userId,
            @Valid @RequestBody TeamMemberRoleUpdateRequest request
    ) {
        teamService.updateTeamMemberRole(authorizationHeader, teamId, userId, request);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{teamId}/members/{userId}")
    public ResponseEntity<Void> removeTeamMember(
            @RequestHeader(name = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
            @PathVariable Long teamId,
            @PathVariable Long userId
    ) {
        teamService.removeTeamMember(authorizationHeader, teamId, userId);
        return ResponseEntity.noContent().build();
    }
}
