package org.example.domain.resource.dto;

import io.swagger.v3.oas.annotations.media.Schema;

public record SharedResourceUpdateRequest(
        @Schema(example = "Spring Boot 공식 문서 (수정)") String title,
        @Schema(example = "https://docs.spring.io/spring-boot/") String url,
        @Schema(example = "문서", allowableValues = {"Figma", "Notion", "GitHub", "Confluence", "문서", "기타"}) String category,
        @Schema(example = "수정된 설명입니다.") String description
) {
}
