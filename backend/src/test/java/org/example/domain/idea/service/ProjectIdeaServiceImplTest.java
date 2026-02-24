package org.example.domain.idea.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.domain.idea.dto.ProjectIdeaCreateRequest;
import org.example.domain.idea.dto.ProjectIdeaDetailResponse;
import org.example.domain.idea.dto.ProjectIdeaListResponse;
import org.example.domain.idea.dto.ProjectIdeaStatusUpdateRequest;
import org.example.domain.idea.dto.ProjectIdeaUpdateRequest;
import org.example.domain.idea.dto.ProjectIdeaVoteResponse;
import org.example.domain.idea.entity.IdeaVote;
import org.example.domain.idea.entity.ProjectIdea;
import org.example.domain.idea.repository.IdeaVoteRepository;
import org.example.domain.idea.repository.ProjectIdeaRepository;
import org.example.domain.user.entity.PortalUser;
import org.example.domain.user.repository.PortalUserRepository;
import org.example.global.security.JwtTokenProvider;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
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
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProjectIdeaServiceImplTest {

    @Mock
    private ProjectIdeaRepository projectIdeaRepository;

    @Mock
    private IdeaVoteRepository ideaVoteRepository;

    @Mock
    private PortalUserRepository portalUserRepository;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private ProjectIdeaServiceImpl projectIdeaService;

    @Captor
    private ArgumentCaptor<Pageable> pageableCaptor;

    @Captor
    private ArgumentCaptor<ProjectIdea> projectIdeaCaptor;

    @Captor
    private ArgumentCaptor<IdeaVote> ideaVoteCaptor;

    @Test
    @DisplayName("목록 조회 시 페이징/정렬을 적용하고 좋아요 수를 함께 반환한다")
    void findPage() {
        ProjectIdea entity = sampleIdea(1L);
        when(projectIdeaRepository.findAll(any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(entity)));
        when(ideaVoteRepository.countByIdeaId(1L)).thenReturn(3L);

        Page<ProjectIdeaListResponse> page = projectIdeaService.findPage(1, 10);

        verify(projectIdeaRepository).findAll(pageableCaptor.capture());
        Pageable pageable = pageableCaptor.getValue();
        Sort.Order idOrder = pageable.getSort().getOrderFor("id");

        assertThat(pageable.getPageNumber()).isEqualTo(1);
        assertThat(pageable.getPageSize()).isEqualTo(10);
        assertThat(idOrder).isNotNull();
        assertThat(idOrder.getDirection()).isEqualTo(Sort.Direction.DESC);

        assertThat(page.getContent()).hasSize(1);
        ProjectIdeaListResponse response = page.getContent().get(0);
        assertThat(response.ideaNo()).isEqualTo("ID-001");
        assertThat(response.content()).isEqualTo("아이디어 내용");
        assertThat(response.likeCount()).isEqualTo(3L);
    }

    @Test
    @DisplayName("상세 조회 시 benefits JSON을 배열로 파싱한다")
    void findById() {
        ProjectIdea entity = sampleIdea(3L);
        entity.setBenefits("[\"효과1\",\"효과2\"]");
        when(projectIdeaRepository.findById(3L)).thenReturn(Optional.of(entity));
        when(ideaVoteRepository.countByIdeaId(3L)).thenReturn(9L);

        ProjectIdeaDetailResponse response = projectIdeaService.findById(3L);

        assertThat(response.id()).isEqualTo(3L);
        assertThat(response.ideaNo()).isEqualTo("ID-001");
        assertThat(response.benefits()).containsExactly("효과1", "효과2");
        assertThat(response.likeCount()).isEqualTo(9L);
    }

    @Test
    @DisplayName("생성 시 기본값(category/status)과 문서번호를 세팅한다")
    void create() {
        ProjectIdeaCreateRequest request = new ProjectIdeaCreateRequest(
                "개선 아이디어",
                "아이디어 내용",
                List.of("효과 1"),
                "",
                " ",
                " ",
                10L,
                2L
        );

        when(projectIdeaRepository.save(any(ProjectIdea.class))).thenAnswer(invocation -> {
            ProjectIdea row = invocation.getArgument(0);
            row.setId(100L);
            return row;
        });

        Long createdId = projectIdeaService.create(request);

        verify(projectIdeaRepository).save(projectIdeaCaptor.capture());
        ProjectIdea saved = projectIdeaCaptor.getValue();

        assertThat(createdId).isEqualTo(100L);
        assertThat(saved.getIdeaNo()).startsWith("ID-");
        assertThat(saved.getCategory()).isEqualTo("기타");
        assertThat(saved.getStatus()).isEqualTo("제안됨");
        assertThat(saved.getStatusNote()).isNull();
    }

    @Test
    @DisplayName("수정 시 null이 아닌 필드만 반영한다")
    void update() {
        ProjectIdea entity = sampleIdea(7L);
        when(projectIdeaRepository.findById(7L)).thenReturn(Optional.of(entity));

        ProjectIdeaUpdateRequest request = new ProjectIdeaUpdateRequest(
                "수정 제목",
                null,
                List.of("효과 A"),
                "기능",
                "검토중",
                "검토 메모"
        );

        projectIdeaService.update(7L, request);

        assertThat(entity.getTitle()).isEqualTo("수정 제목");
        assertThat(entity.getContent()).isEqualTo("아이디어 내용");
        assertThat(entity.getCategory()).isEqualTo("기능");
        assertThat(entity.getStatus()).isEqualTo("검토중");
        assertThat(entity.getStatusNote()).isEqualTo("검토 메모");
        assertThat(entity.getBenefits()).isEqualTo("[\"효과 A\"]");
    }

    @Test
    @DisplayName("상태 변경 시 status를 업데이트한다")
    void updateStatus() {
        ProjectIdea entity = sampleIdea(7L);
        when(projectIdeaRepository.findById(7L)).thenReturn(Optional.of(entity));

        projectIdeaService.updateStatus(7L, new ProjectIdeaStatusUpdateRequest("채택", "반영 예정"));

        assertThat(entity.getStatus()).isEqualTo("채택");
        assertThat(entity.getStatusNote()).isEqualTo("반영 예정");
    }

    @Test
    @DisplayName("상태 변경 시 status가 비어 있으면 400")
    void updateStatusBadRequest() {
        assertThatThrownBy(() -> projectIdeaService.updateStatus(7L, new ProjectIdeaStatusUpdateRequest(" ", null)))
                .isInstanceOfSatisfying(ResponseStatusException.class, ex ->
                        assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST)
                );
    }

    @Test
    @DisplayName("좋아요 시 기존 투표가 없으면 저장하고 liked=true를 반환한다")
    void likeIdea() {
        ProjectIdea entity = sampleIdea(9L);
        when(projectIdeaRepository.findById(9L)).thenReturn(Optional.of(entity));
        when(jwtTokenProvider.extractUserId("token")).thenReturn(2L);
        when(portalUserRepository.findById(2L)).thenReturn(Optional.of(activeUser(2L)));
        when(ideaVoteRepository.existsByIdeaIdAndUserId(9L, 2L)).thenReturn(false);
        when(ideaVoteRepository.countByIdeaId(9L)).thenReturn(11L);

        ProjectIdeaVoteResponse response = projectIdeaService.likeIdea(9L, "Bearer token");

        verify(ideaVoteRepository).save(ideaVoteCaptor.capture());
        IdeaVote saved = ideaVoteCaptor.getValue();
        assertThat(saved.getIdeaId()).isEqualTo(9L);
        assertThat(saved.getUserId()).isEqualTo(2L);
        assertThat(response.liked()).isTrue();
        assertThat(response.likeCount()).isEqualTo(11L);
    }

    @Test
    @DisplayName("좋아요 취소 시 투표를 삭제하고 liked=false를 반환한다")
    void unlikeIdea() {
        ProjectIdea entity = sampleIdea(9L);
        when(projectIdeaRepository.findById(9L)).thenReturn(Optional.of(entity));
        when(jwtTokenProvider.extractUserId("token")).thenReturn(2L);
        when(portalUserRepository.findById(2L)).thenReturn(Optional.of(activeUser(2L)));
        when(ideaVoteRepository.countByIdeaId(9L)).thenReturn(10L);

        ProjectIdeaVoteResponse response = projectIdeaService.unlikeIdea(9L, "Bearer token");

        verify(ideaVoteRepository).deleteByIdeaIdAndUserId(9L, 2L);
        assertThat(response.liked()).isFalse();
        assertThat(response.likeCount()).isEqualTo(10L);
    }

    private ProjectIdea sampleIdea(Long id) {
        ProjectIdea entity = new ProjectIdea();
        entity.setId(id);
        entity.setIdeaNo("ID-001");
        entity.setTeamId(10L);
        entity.setTitle("개선 아이디어");
        entity.setContent("아이디어 내용");
        entity.setBenefits("[\"효과\"]");
        entity.setCategory("UX/UI");
        entity.setStatus("제안됨");
        entity.setStatusNote(null);
        entity.setProposedBy(2L);
        entity.setCreatedAt(LocalDateTime.of(2026, 2, 24, 11, 0));
        entity.setUpdatedAt(LocalDateTime.of(2026, 2, 24, 11, 0));
        return entity;
    }

    private PortalUser activeUser(Long id) {
        PortalUser user = new PortalUser();
        user.setId(id);
        user.setName("사용자");
        user.setEmail("user@example.com");
        user.setIsActive(true);
        return user;
    }
}
