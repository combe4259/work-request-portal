package org.example.domain.notification.service;

import org.example.domain.notification.dto.NotificationCreateRequest;
import org.example.domain.notification.dto.NotificationListResponse;
import org.example.domain.notification.dto.NotificationUpdateRequest;
import org.example.domain.notification.entity.Notification;
import org.example.domain.notification.repository.NotificationRepository;
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
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationServiceImplTest {

    @Mock
    private NotificationRepository notificationRepository;

    @InjectMocks
    private NotificationServiceImpl notificationService;

    @Captor
    private ArgumentCaptor<Pageable> pageableCaptor;

    @Captor
    private ArgumentCaptor<Notification> notificationCaptor;

    @Test
    @DisplayName("목록 조회 시 user/read 필터를 적용하고 페이징/정렬을 사용한다")
    void findPageWithFilters() {
        Notification entity = sampleEntity(1L);
        when(notificationRepository.findByUserIdAndIsReadOrderByIdDesc(eq(2L), eq(false), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(entity)));

        Page<NotificationListResponse> page = notificationService.findPage(2L, false, 1, 5);

        verify(notificationRepository).findByUserIdAndIsReadOrderByIdDesc(eq(2L), eq(false), pageableCaptor.capture());
        Pageable pageable = pageableCaptor.getValue();
        Sort.Order idOrder = pageable.getSort().getOrderFor("id");

        assertThat(pageable.getPageNumber()).isEqualTo(1);
        assertThat(pageable.getPageSize()).isEqualTo(5);
        assertThat(idOrder).isNotNull();
        assertThat(idOrder.getDirection()).isEqualTo(Sort.Direction.DESC);

        assertThat(page.getContent()).hasSize(1);
        assertThat(page.getContent().get(0).id()).isEqualTo(1L);
        assertThat(page.getContent().get(0).title()).isEqualTo("상태 변경");
    }

    @Test
    @DisplayName("생성 시 필수값을 검증하고 문자열을 정리해 저장한다")
    void create() {
        NotificationCreateRequest request = new NotificationCreateRequest(
                2L,
                "  상태변경  ",
                "  업무 상태 변경  ",
                "  메시지  ",
                "  WORK_REQUEST  ",
                11L,
                null
        );

        when(notificationRepository.save(any(Notification.class))).thenAnswer(invocation -> {
            Notification row = invocation.getArgument(0);
            row.setId(10L);
            return row;
        });

        Long id = notificationService.create(request);

        verify(notificationRepository).save(notificationCaptor.capture());
        Notification saved = notificationCaptor.getValue();

        assertThat(id).isEqualTo(10L);
        assertThat(saved.getUserId()).isEqualTo(2L);
        assertThat(saved.getType()).isEqualTo("상태변경");
        assertThat(saved.getTitle()).isEqualTo("업무 상태 변경");
        assertThat(saved.getMessage()).isEqualTo("메시지");
        assertThat(saved.getRefType()).isEqualTo("WORK_REQUEST");
        assertThat(saved.getRefId()).isEqualTo(11L);
        assertThat(saved.getIsRead()).isFalse();
        assertThat(saved.getSlackSent()).isFalse();
    }

    @Test
    @DisplayName("수정 시 전달된 필드만 반영한다")
    void update() {
        Notification entity = sampleEntity(3L);
        when(notificationRepository.findById(3L)).thenReturn(Optional.of(entity));

        NotificationUpdateRequest request = new NotificationUpdateRequest(
                "  배포완료  ",
                "  배포가 완료되었습니다  ",
                "  상세 메시지  ",
                "  DEPLOYMENT  ",
                77L,
                true,
                true
        );

        notificationService.update(3L, request);

        assertThat(entity.getType()).isEqualTo("배포완료");
        assertThat(entity.getTitle()).isEqualTo("배포가 완료되었습니다");
        assertThat(entity.getMessage()).isEqualTo("상세 메시지");
        assertThat(entity.getRefType()).isEqualTo("DEPLOYMENT");
        assertThat(entity.getRefId()).isEqualTo(77L);
        assertThat(entity.getIsRead()).isTrue();
        assertThat(entity.getSlackSent()).isTrue();
    }

    @Test
    @DisplayName("읽음 상태 변경 시 isRead를 업데이트한다")
    void updateReadState() {
        Notification entity = sampleEntity(5L);
        when(notificationRepository.findById(5L)).thenReturn(Optional.of(entity));

        notificationService.updateReadState(5L, true);

        assertThat(entity.getIsRead()).isTrue();
    }

    @Test
    @DisplayName("전체 읽음 상태 변경 시 userId 기준 update 쿼리를 호출한다")
    void updateAllReadState() {
        notificationService.updateAllReadState(2L, true);

        verify(notificationRepository).updateReadStateByUserId(2L, true);
    }

    @Test
    @DisplayName("삭제 시 대상을 조회한 뒤 삭제한다")
    void delete() {
        Notification entity = sampleEntity(8L);
        when(notificationRepository.findById(8L)).thenReturn(Optional.of(entity));

        notificationService.delete(8L);

        verify(notificationRepository).delete(entity);
    }

    @Test
    @DisplayName("생성 시 userId가 없으면 400 예외")
    void createBadRequest() {
        NotificationCreateRequest request = new NotificationCreateRequest(
                null,
                "상태변경",
                "제목",
                null,
                null,
                null,
                false
        );

        assertThatThrownBy(() -> notificationService.create(request))
                .isInstanceOfSatisfying(ResponseStatusException.class, ex ->
                        assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST)
                );
    }

    private Notification sampleEntity(Long id) {
        Notification entity = new Notification();
        entity.setId(id);
        entity.setUserId(2L);
        entity.setType("상태변경");
        entity.setTitle("상태 변경");
        entity.setMessage("상세 메시지");
        entity.setRefType("WORK_REQUEST");
        entity.setRefId(11L);
        entity.setIsRead(false);
        entity.setSlackSent(false);
        entity.setCreatedAt(LocalDateTime.of(2026, 2, 25, 10, 0));
        return entity;
    }
}
