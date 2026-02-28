package org.example.domain.auth.dto;

public record AuthLoginResult(
        LoginResponse response,
        String refreshToken
) {
}
