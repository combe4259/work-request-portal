package org.example.domain.team.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TeamJoinRequest(
        @NotBlank(message = "초대 코드를 입력해주세요.")
        @Size(min = 4, max = 20, message = "초대 코드는 4자 이상 20자 이하여야 합니다.")
        String inviteCode
) {
}
