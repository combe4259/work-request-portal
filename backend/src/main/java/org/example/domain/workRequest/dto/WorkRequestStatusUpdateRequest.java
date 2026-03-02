package org.example.domain.workRequest.dto;

import io.swagger.v3.oas.annotations.media.Schema;

public record WorkRequestStatusUpdateRequest(
        @Schema(example = "접수완료", allowableValues = {"접수대기", "접수완료", "개발중", "완료", "반려"}) String status,
        @Schema(example = "요청 내용 검토 후 접수 완료했습니다.") String statusNote
) {
}
