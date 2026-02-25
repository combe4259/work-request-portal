package org.example.domain.user.dto;

public record UserProfileResponse(
        String name,
        String email,
        String role,
        String avatarColor,
        String photoUrl
) {
}
