package org.example.domain.deployment.dto;

import io.swagger.v3.oas.annotations.media.Schema;

public record DeploymentStatusUpdateRequest(
        @Schema(example = "완료", description = "대기 | 진행중 | 완료 | 실패 | 롤백") String status,
        @Schema(example = "모든 서버 정상 배포 완료 확인됨") String statusNote
) {
}
