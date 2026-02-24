package org.example.domain.auth.dto;

public record AuthTeamResponse(
        Long id,
        String name,
        String description,
        String teamRole
) {
}
