package org.example.domain.comment.dto;

import io.swagger.v3.oas.annotations.media.Schema;

public record CommentCreateRequest(
        @Schema(example = "WORK_REQUEST", description = "WORK_REQUEST | TECH_TASK | TEST_SCENARIO | DEPLOYMENT | DEFECT | IDEA") String refType,
        @Schema(example = "1") Long refId,
        @Schema(example = "해당 요청 검토했습니다. 우선순위 조정이 필요할 것 같습니다.") String content,
        @Schema(example = "1") Long authorId
) {
}
