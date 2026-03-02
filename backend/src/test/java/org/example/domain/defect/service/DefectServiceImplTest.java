package org.example.domain.defect.service;

import org.example.domain.defect.dto.DefectCreateRequest;
import org.example.domain.defect.dto.DefectDetailResponse;
import org.example.domain.defect.dto.DefectListQuery;
import org.example.domain.defect.dto.DefectListResponse;
import org.example.domain.defect.dto.DefectStatusUpdateRequest;
import org.example.domain.defect.dto.DefectUpdateRequest;
import org.example.domain.defect.entity.Defect;
import org.example.domain.defect.repository.DefectRepository;
import org.example.domain.documentIndex.service.DocumentIndexSyncService;
import org.example.domain.notification.service.NotificationEventService;
import org.example.global.team.TeamRequestContext;
import org.example.global.util.DocumentNoGenerator;
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
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DefectServiceImplTest {

    @Mock
    private DefectRepository defectRepository;

    @Mock
    private DocumentNoGenerator documentNoGenerator;

    @Mock
    private NotificationEventService notificationEventService;

    @Mock
    private DocumentIndexSyncService documentIndexSyncService;

    @InjectMocks
    private DefectServiceImpl defectService;

    @Captor
    private ArgumentCaptor<Defect> defectCaptor;

    @Captor
    private ArgumentCaptor<Pageable> pageableCaptor;

    @BeforeEach
    void setUpTeamContext() {
        TeamRequestContext.set(1L, 10L);
    }

    @AfterEach
    void clearTeamContext() {
        TeamRequestContext.clear();
    }

    @Test
    @DisplayName("목록 조회 시 페이징/정렬을 적용하고 리스트 응답으로 매핑한다")
    void findPage() {
        Defect entity = sampleEntity(1L);
        when(defectRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(entity)));

        Page<DefectListResponse> page = defectService.findPage(2, 5, new DefectListQuery(
                null, null, null, null, null, null, null, "id", "desc"
        ));

        verify(defectRepository).findAll(any(Specification.class), pageableCaptor.capture());
        Pageable pageable = pageableCaptor.getValue();
        Sort.Order idOrder = pageable.getSort().getOrderFor("id");

        assertThat(pageable.getPageNumber()).isEqualTo(2);
        assertThat(pageable.getPageSize()).isEqualTo(5);
        assertThat(idOrder).isNotNull();
        assertThat(idOrder.getDirection()).isEqualTo(Sort.Direction.DESC);
        assertThat(page.getContent()).hasSize(1);
        assertThat(page.getContent().get(0).id()).isEqualTo(1L);
    }

    @Test
    @DisplayName("상세 조회 성공 시 엔티티를 상세 응답으로 반환한다")
    void findById() {
        Defect entity = sampleEntity(3L);
        when(defectRepository.findById(3L)).thenReturn(Optional.of(entity));

        DefectDetailResponse response = defectService.findById(3L);

        assertThat(response.id()).isEqualTo(3L);
        assertThat(response.defectNo()).isEqualTo("DF-001");
        assertThat(response.title()).isEqualTo("로그인 버튼 오류");
    }

    @Test
    @DisplayName("상세 조회 대상이 없으면 404 예외를 던진다")
    void findByIdNotFound() {
        when(defectRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> defectService.findById(999L))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("결함을 찾을 수 없습니다.");
    }

    @Test
    @DisplayName("생성 시 기본값(type/severity/status)과 번호를 세팅한다")
    void create() {
        DefectCreateRequest request = new DefectCreateRequest(
                "로그인 버튼 오류",
                "설명",
                "",     // type → 기능
                " ",    // severity → 보통
                null,   // status → 접수
                null, null,
                "Chrome", "[]",
                "기대 동작", "실제 동작",
                LocalDate.of(2026, 3, 7),
                null,
                20L, null, null, null, null
        );

        when(defectRepository.save(any(Defect.class))).thenAnswer(invocation -> {
            Defect d = invocation.getArgument(0);
            d.setId(50L);
            return d;
        });
        when(documentNoGenerator.next("DF")).thenReturn("DF-001");

        Long createdId = defectService.create(request);

        verify(defectRepository).save(defectCaptor.capture());
        Defect saved = defectCaptor.getValue();

        assertThat(createdId).isEqualTo(50L);
        assertThat(saved.getDefectNo()).isEqualTo("DF-001");
        assertThat(saved.getType()).isEqualTo("기능");
        assertThat(saved.getSeverity()).isEqualTo("보통");
        assertThat(saved.getStatus()).isEqualTo("접수");
        assertThat(saved.getTeamId()).isEqualTo(10L);
        assertThat(saved.getReproductionSteps()).isEqualTo("[]");
    }

    @Test
    @DisplayName("생성 시 title이 없으면 400 예외를 던진다")
    void createWithBlankTitle() {
        DefectCreateRequest request = new DefectCreateRequest(
                "", "설명", null, null, null, null, null,
                null, null, "기대", "실제",
                LocalDate.of(2026, 3, 7), null, 20L, null, null, null, null
        );

        assertThatThrownBy(() -> defectService.create(request))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("title은 필수입니다.");
    }

    @Test
    @DisplayName("생성 시 reporterId가 없으면 400 예외를 던진다")
    void createWithNullReporterId() {
        DefectCreateRequest request = new DefectCreateRequest(
                "제목", "설명", null, null, null, null, null,
                null, null, "기대", "실제",
                LocalDate.of(2026, 3, 7), null, null, null, null, null, null
        );

        assertThatThrownBy(() -> defectService.create(request))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("reporterId는 필수입니다.");
    }

    @Test
    @DisplayName("생성 시 잘못된 relatedRefType이면 400 예외를 던진다")
    void createWithInvalidRelatedRefType() {
        DefectCreateRequest request = new DefectCreateRequest(
                "제목", "설명", null, null, null,
                "INVALID_TYPE", 99L,
                null, null, "기대", "실제",
                LocalDate.of(2026, 3, 7), null, 20L, null, null, null, null
        );

        assertThatThrownBy(() -> defectService.create(request))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("유효하지 않은 relatedRefType");
    }

    @Test
    @DisplayName("수정 시 null이 아닌 필드만 반영한다")
    void update() {
        Defect entity = sampleEntity(7L);
        when(defectRepository.findById(7L)).thenReturn(Optional.of(entity));

        DefectUpdateRequest request = new DefectUpdateRequest(
                "수정 제목", null, "UI", "높음", "수정중",
                null, null, null, null,
                "기대 수정", "실제 수정",
                LocalDate.of(2026, 3, 10), "메모",
                5L, null, null, null
        );

        defectService.update(7L, request);

        assertThat(entity.getTitle()).isEqualTo("수정 제목");
        assertThat(entity.getType()).isEqualTo("UI");
        assertThat(entity.getSeverity()).isEqualTo("높음");
        assertThat(entity.getStatus()).isEqualTo("수정중");
        assertThat(entity.getDeadline()).isEqualTo(LocalDate.of(2026, 3, 10));
        // 변경되지 않아야 할 필드
        assertThat(entity.getDescription()).isEqualTo("결함 설명");
    }

    @Test
    @DisplayName("수정 시 상태가 변경되면 보고자에게 알림을 발행한다")
    void updatePublishesStatusNotification() {
        Defect entity = sampleEntity(7L);
        when(defectRepository.findById(7L)).thenReturn(Optional.of(entity));

        DefectUpdateRequest request = new DefectUpdateRequest(
                null, null, null, null, "완료",
                null, null, null, null, null, null, null, null,
                null, null, null, null
        );

        defectService.update(7L, request);

        verify(notificationEventService).create(
                eq(20L),
                eq("상태변경"),
                eq("결함 상태 변경"),
                contains("완료"),
                eq("DEFECT"),
                eq(7L)
        );
    }

    @Test
    @DisplayName("상태 전용 변경은 상태를 반영한다")
    void updateStatus() {
        Defect entity = sampleEntity(9L);
        when(defectRepository.findById(9L)).thenReturn(Optional.of(entity));

        defectService.updateStatus(9L, new DefectStatusUpdateRequest("완료", "해결 완료"));

        assertThat(entity.getStatus()).isEqualTo("완료");
        assertThat(entity.getStatusNote()).isEqualTo("해결 완료");
    }

    @Test
    @DisplayName("상태 변경 시 status가 없으면 400 예외를 던진다")
    void updateStatusWithBlankStatus() {
        assertThatThrownBy(() -> defectService.updateStatus(1L, new DefectStatusUpdateRequest("", null)))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("status는 필수입니다.");
    }

    private Defect sampleEntity(Long id) {
        Defect entity = new Defect();
        entity.setId(id);
        entity.setDefectNo("DF-001");
        entity.setTitle("로그인 버튼 오류");
        entity.setDescription("결함 설명");
        entity.setType("기능");
        entity.setSeverity("보통");
        entity.setStatus("접수");
        entity.setTeamId(10L);
        entity.setReporterId(20L);
        entity.setAssigneeId(30L);
        entity.setExpectedBehavior("기대 동작");
        entity.setActualBehavior("실제 동작");
        entity.setDeadline(LocalDate.of(2026, 3, 7));
        entity.setCreatedAt(LocalDateTime.of(2026, 2, 1, 9, 0));
        entity.setUpdatedAt(LocalDateTime.of(2026, 2, 2, 9, 0));
        return entity;
    }
}
