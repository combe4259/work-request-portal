package org.example.domain.auth.dto;

public record AuthRefreshResult(
        String accessToken,
        String refreshToken
) {
}
