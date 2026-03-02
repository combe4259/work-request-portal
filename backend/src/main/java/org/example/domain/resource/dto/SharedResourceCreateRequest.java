package org.example.domain.resource.dto;

import io.swagger.v3.oas.annotations.media.Schema;

public record SharedResourceCreateRequest(
        @Schema(example = "Spring Boot 공식 문서") String title,
        @Schema(example = "https://docs.spring.io/spring-boot/docs/current/reference/html/") String url,
        @Schema(example = "문서", allowableValues = {"Figma", "Notion", "GitHub", "Confluence", "문서", "기타"}) String category,
        @Schema(example = "Spring Boot 3.x 공식 레퍼런스 문서입니다.") String description,
        @Schema(example = "1") Long teamId,
        @Schema(example = "1") Long registeredBy
) {
}
