package org.example.domain.activityLog.service;

import org.example.domain.activityLog.dto.ActivityLogListResponse;
import org.example.domain.activityLog.entity.ActivityLog;
import org.example.domain.activityLog.repository.ActivityLogRepository;
import org.example.global.team.TeamRequestContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ActivityLogServiceImplTest {

    @Mock
    private ActivityLogRepository activityLogRepository;

    @InjectMocks
    private ActivityLogServiceImpl activityLogService;

    @Captor
    private ArgumentCaptor<ActivityLog> logCaptor;

    @BeforeEach
    void setUpTeamContext() {
        TeamRequestContext.set(1L, 10L);
    }

    @AfterEach
    void clearTeamContext() {
        TeamRequestContext.clear();
    }

    @Test
    @DisplayName("처리이력 목록 조회 시 팀/refType/refId 조건으로 페이징 조회한다")
    void findPage() {
        ActivityLog entity = sampleEntity(1L);
        when(activityLogRepository.findByTeamIdAndRefTypeAndRefIdOrderByIdDesc(
                eq(10L), eq("WORK_REQUEST"), eq(5L), any(Pageable.class)
        )).thenReturn(new PageImpl<>(List.of(entity)));

        Page<ActivityLogListResponse> page = activityLogService.findPage("work_request", 5L, 0, 20);

        assertThat(page.getContent()).hasSize(1);
        assertThat(page.getContent().get(0).id()).isEqualTo(1L);
        assertThat(page.getContent().get(0).refType()).isEqualTo("WORK_REQUEST");
        assertThat(page.getContent().get(0).actionType()).isEqualTo("CREATED");
    }

    @Test
    @DisplayName("refType이 소문자여도 대문자로 정규화하여 조회한다")
    void findPageNormalizesRefType() {
        when(activityLogRepository.findByTeamIdAndRefTypeAndRefIdOrderByIdDesc(
                eq(10L), eq("TECH_TASK"), eq(3L), any(Pageable.class)
        )).thenReturn(new PageImpl<>(List.of()));

        Page<ActivityLogListResponse> page = activityLogService.findPage("tech_task", 3L, 0, 20);

        assertThat(page.getContent()).isEmpty();
    }

    @Test
    @DisplayName("refType이 없으면 400 예외를 던진다")
    void findPageWithBlankRefType() {
        assertThatThrownBy(() -> activityLogService.findPage("", 5L, 0, 20))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("refType은 필수입니다.");
    }

    @Test
    @DisplayName("유효하지 않은 refType이면 400 예외를 던진다")
    void findPageWithInvalidRefType() {
        assertThatThrownBy(() -> activityLogService.findPage("INVALID", 5L, 0, 20))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("유효하지 않은 refType");
    }

    @Test
    @DisplayName("refId가 없으면 400 예외를 던진다")
    void findPageWithNullRefId() {
        assertThatThrownBy(() -> activityLogService.findPage("WORK_REQUEST", null, 0, 20))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("refId는 필수입니다.");
    }

    @Test
    @DisplayName("처리이력 기록 시 엔티티를 정규화하여 저장한다")
    void recordLog() {
        activityLogService.recordLog(new ActivityLogCreateCommand(
                10L, "work_request", 5L,
                "CREATED", 1L,
                null, null, null,
                "WR-001 업무요청이 등록되었습니다."
        ));

        verify(activityLogRepository).save(logCaptor.capture());
        ActivityLog saved = logCaptor.getValue();

        assertThat(saved.getTeamId()).isEqualTo(10L);
        assertThat(saved.getRefType()).isEqualTo("WORK_REQUEST");
        assertThat(saved.getRefId()).isEqualTo(5L);
        assertThat(saved.getActionType()).isEqualTo("CREATED");
        assertThat(saved.getMessage()).isEqualTo("WR-001 업무요청이 등록되었습니다.");
        assertThat(saved.getFieldName()).isNull();
    }

    @Test
    @DisplayName("처리이력 기록 시 STATUS_CHANGED는 before/after 값을 저장한다")
    void recordLogStatusChanged() {
        activityLogService.recordLog(new ActivityLogCreateCommand(
                10L, "DEFECT", 7L,
                "STATUS_CHANGED", 1L,
                "status", "접수", "수정중",
                "DF-001 상태가 '수정중'으로 변경되었습니다."
        ));

        verify(activityLogRepository).save(logCaptor.capture());
        ActivityLog saved = logCaptor.getValue();

        assertThat(saved.getFieldName()).isEqualTo("status");
        assertThat(saved.getBeforeValue()).isEqualTo("접수");
        assertThat(saved.getAfterValue()).isEqualTo("수정중");
    }

    @Test
    @DisplayName("command가 null이면 저장하지 않고 조용히 반환한다")
    void recordLogWithNullCommand() {
        activityLogService.recordLog(null);

        verify(activityLogRepository, never()).save(any());
    }

    @Test
    @DisplayName("teamId가 null이면 저장하지 않고 조용히 반환한다")
    void recordLogWithNullTeamId() {
        activityLogService.recordLog(new ActivityLogCreateCommand(
                null, "WORK_REQUEST", 5L, "CREATED", null,
                null, null, null, "메시지"
        ));

        verify(activityLogRepository, never()).save(any());
    }

    @Test
    @DisplayName("actionType이 없으면 저장하지 않고 조용히 반환한다")
    void recordLogWithBlankActionType() {
        activityLogService.recordLog(new ActivityLogCreateCommand(
                10L, "WORK_REQUEST", 5L, "", null,
                null, null, null, "메시지"
        ));

        verify(activityLogRepository, never()).save(any());
    }

    private ActivityLog sampleEntity(Long id) {
        ActivityLog entity = new ActivityLog();
        entity.setId(id);
        entity.setTeamId(10L);
        entity.setRefType("WORK_REQUEST");
        entity.setRefId(5L);
        entity.setActionType("CREATED");
        entity.setActorId(1L);
        entity.setMessage("WR-001 업무요청이 등록되었습니다.");
        entity.setCreatedAt(LocalDateTime.of(2026, 2, 1, 9, 0));
        return entity;
    }
}
