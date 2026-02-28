package org.example.domain.team.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TeamCreateRequest(
        @Schema(example = "백엔드개발팀")
        @NotBlank(message = "팀 이름은 필수입니다.")
        @Size(min = 2, max = 100, message = "팀 이름은 2자 이상 100자 이하여야 합니다.")
        String name,

        @Schema(example = "Spring Boot / JPA 기반 백엔드 개발 담당 팀")
        @Size(max = 200, message = "팀 설명은 200자를 초과할 수 없습니다.")
        String description
) {
}
