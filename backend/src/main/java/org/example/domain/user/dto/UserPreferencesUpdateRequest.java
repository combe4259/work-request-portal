package org.example.domain.user.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UserPreferencesUpdateRequest(
        @NotNull(message = "알림 설정은 필수입니다.")
        @Valid
        Notification notification,

        @NotNull(message = "화면 설정은 필수입니다.")
        @Valid
        Display display
) {
    public record Notification(
            @NotNull(message = "업무 배정 알림 여부는 필수입니다.")
            Boolean assign,

            @NotNull(message = "댓글 알림 여부는 필수입니다.")
            Boolean comment,

            @NotNull(message = "마감 임박 알림 여부는 필수입니다.")
            Boolean deadline,

            @NotNull(message = "상태 변경 알림 여부는 필수입니다.")
            Boolean status,

            @NotNull(message = "배포 완료 알림 여부는 필수입니다.")
            Boolean deploy,

            @NotNull(message = "멘션 알림 여부는 필수입니다.")
            Boolean mention
    ) {
    }

    public record Display(
            @NotBlank(message = "기본 랜딩 페이지는 필수입니다.")
            @Size(max = 50, message = "기본 랜딩 페이지 값이 너무 깁니다.")
            String landing,

            @NotNull(message = "기본 표시 건수는 필수입니다.")
            @Min(value = 1, message = "기본 표시 건수는 1 이상이어야 합니다.")
            @Max(value = 500, message = "기본 표시 건수는 500 이하여야 합니다.")
            Integer rowCount
    ) {
    }
}
