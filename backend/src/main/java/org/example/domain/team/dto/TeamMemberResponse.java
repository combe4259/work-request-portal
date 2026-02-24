package org.example.domain.team.dto;

public record TeamMemberResponse(
        Long userId,
        String name,
        String email,
        String teamRole
) {
}
