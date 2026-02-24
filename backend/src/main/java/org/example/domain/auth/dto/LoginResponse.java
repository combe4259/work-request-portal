package org.example.domain.auth.dto;

import java.util.List;

public record LoginResponse(
        String accessToken,
        AuthUserResponse user,
        List<AuthTeamResponse> teams
) {
}
