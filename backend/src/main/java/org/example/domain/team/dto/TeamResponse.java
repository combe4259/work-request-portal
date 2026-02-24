package org.example.domain.team.dto;

public record TeamResponse(
        Long id,
        String name,
        String description,
        String teamRole,
        String inviteCode
) {
}
