package org.example.domain.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UserProfileUpdateRequest(
        @Schema(example = "홍길동")
        @NotBlank(message = "이름은 필수입니다.")
        @Size(max = 50, message = "이름은 50자 이하여야 합니다.")
        String name,

        @Schema(example = "hong@example.com")
        @NotBlank(message = "이메일은 필수입니다.")
        @Email(message = "이메일 형식이 올바르지 않습니다.")
        @Size(max = 100, message = "이메일은 100자 이하여야 합니다.")
        String email,

        @Schema(example = "백엔드개발자")
        @NotBlank(message = "역할은 필수입니다.")
        @Size(max = 30, message = "역할은 30자 이하여야 합니다.")
        String role,

        @Schema(example = "#4F46E5")
        @Size(max = 20, message = "아바타 색상 값이 너무 깁니다.")
        String avatarColor,

        @Schema(example = "null")
        String photoUrl,

        @Schema(example = "U012AB3CD")
        @Size(max = 50, message = "Slack 사용자 ID는 50자 이하여야 합니다.")
        String slackUserId
) {
}
