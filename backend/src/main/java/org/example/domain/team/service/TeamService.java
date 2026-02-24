package org.example.domain.team.service;

import org.example.domain.team.dto.TeamCreateRequest;
import org.example.domain.team.dto.TeamJoinRequest;
import org.example.domain.team.dto.TeamMemberResponse;
import org.example.domain.team.dto.TeamMemberRoleUpdateRequest;
import org.example.domain.team.dto.TeamResponse;

import java.util.List;

public interface TeamService {
    List<TeamResponse> getMyTeams(String authorizationHeader);

    TeamResponse createTeam(String authorizationHeader, TeamCreateRequest request);

    TeamResponse joinTeam(String authorizationHeader, TeamJoinRequest request);

    List<TeamMemberResponse> getTeamMembers(String authorizationHeader, Long teamId);

    void updateTeamMemberRole(String authorizationHeader, Long teamId, Long userId, TeamMemberRoleUpdateRequest request);

    void removeTeamMember(String authorizationHeader, Long teamId, Long userId);
}
