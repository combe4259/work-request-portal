package org.example.domain.knowledgeBase.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

public record KnowledgeBaseArticleUpdateRequest(
        @Schema(example = "JWT 인증 구현 가이드 (수정)") String title,
        @Schema(example = "개발 가이드", allowableValues = {"개발 가이드", "아키텍처", "트러블슈팅", "온보딩", "기타"}) String category,
        @Schema(example = "[\"JWT\",\"인증\"]") List<String> tags,
        @Schema(example = "수정된 요약입니다.") String summary,
        @Schema(example = "수정된 본문 내용입니다.") String content
) {
}
