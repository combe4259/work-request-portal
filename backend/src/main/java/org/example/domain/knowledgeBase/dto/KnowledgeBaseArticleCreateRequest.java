package org.example.domain.knowledgeBase.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

public record KnowledgeBaseArticleCreateRequest(
        @Schema(example = "JWT 인증 구현 가이드") String title,
        @Schema(example = "개발 가이드", allowableValues = {"개발 가이드", "아키텍처", "트러블슈팅", "온보딩", "기타"}) String category,
        @Schema(example = "[\"JWT\",\"인증\",\"Spring Security\"]") List<String> tags,
        @Schema(example = "Spring Boot에서 JWT 기반 인증을 구현하는 방법을 설명합니다.") String summary,
        @Schema(example = "## 개요\njjwt 라이브러리를 사용한 JWT 발급/검증 구현 방법입니다.\n\n## 의존성 추가\n...") String content,
        @Schema(example = "1") Long teamId,
        @Schema(example = "1") Long authorId
) {
}
