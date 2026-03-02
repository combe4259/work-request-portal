package org.example.domain.defect.dto;

import io.swagger.v3.oas.annotations.media.Schema;

public record DefectStatusUpdateRequest(
        @Schema(example = "수정중", allowableValues = {"접수", "분석중", "수정중", "검증중", "완료", "재현불가", "보류"}) String status,
        @Schema(example = "토큰 만료 시간 설정 오류 수정 완료") String statusNote
) {
}
