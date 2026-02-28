package org.example.domain.comment.dto;

import io.swagger.v3.oas.annotations.media.Schema;

public record CommentUpdateRequest(
        @Schema(example = "해당 요청 검토했습니다. 우선순위 높음으로 조정 요청드립니다.") String content
) {
}
