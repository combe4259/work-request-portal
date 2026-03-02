package org.example.domain.idea.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

public record ProjectIdeaUpdateRequest(
        @Schema(example = "AI 기반 업무요청 자동 분류 기능 (수정)") String title,
        @Schema(example = "업무요청 등록 시 AI가 유형/우선순위를 자동으로 분류해주면 PM 리소스를 크게 절감할 수 있습니다.") String content,
        @Schema(example = "[\"PM 업무 30% 절감\",\"오분류율 감소\"]") List<String> benefits,
        @Schema(example = "기능", allowableValues = {"UX/UI", "기능", "인프라", "프로세스", "기타"}) String category,
        @Schema(example = "채택", allowableValues = {"제안됨", "검토중", "채택", "보류", "기각"}) String status,
        @Schema(example = "Q2 스프린트에 반영 예정") String statusNote
) {
}
