package org.example.domain.team.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TeamMemberRoleUpdateRequest(
        @NotBlank(message = "팀 역할은 필수입니다.")
        @Size(max = 20, message = "팀 역할은 20자를 초과할 수 없습니다.")
        String teamRole
) {
}
