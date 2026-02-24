package org.example.domain.auth.dto;

public record AuthUserResponse(
        Long id,
        String name,
        String email,
        String role,
        String slackUserId
) {
}
