package org.example.domain.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UserPasswordUpdateRequest(
        @Schema(example = "password123!")
        @NotBlank(message = "현재 비밀번호를 입력해주세요.")
        String currentPassword,

        @Schema(example = "newpassword456!")
        @NotBlank(message = "새 비밀번호를 입력해주세요.")
        @Size(min = 8, max = 72, message = "새 비밀번호는 8자 이상 72자 이하여야 합니다.")
        String newPassword
) {
}
