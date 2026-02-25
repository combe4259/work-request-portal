package org.example.domain.knowledgeBase.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.domain.knowledgeBase.dto.KnowledgeBaseArticleCreateRequest;
import org.example.domain.knowledgeBase.dto.KnowledgeBaseArticleListResponse;
import org.example.domain.knowledgeBase.dto.KnowledgeBaseArticleUpdateRequest;
import org.example.domain.knowledgeBase.entity.KnowledgeBaseArticle;
import org.example.domain.knowledgeBase.repository.KnowledgeBaseArticleRepository;
import org.example.global.util.DocumentNoGenerator;
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
class KnowledgeBaseArticleServiceImplTest {

    @Mock
    private KnowledgeBaseArticleRepository knowledgeBaseArticleRepository;

    @Mock
    private DocumentNoGenerator documentNoGenerator;

    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private KnowledgeBaseArticleServiceImpl knowledgeBaseArticleService;

    @Captor
    private ArgumentCaptor<Pageable> pageableCaptor;

    @Captor
    private ArgumentCaptor<KnowledgeBaseArticle> articleCaptor;

    @Test
    @DisplayName("목록 조회 시 페이징/정렬을 적용하고 tags JSON을 리스트로 변환한다")
    void findPage() {
        KnowledgeBaseArticle entity = sampleEntity(1L);
        entity.setTags("[\"가이드\",\"트러블슈팅\"]");
        when(knowledgeBaseArticleRepository.findAll(any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(entity)));

        Page<KnowledgeBaseArticleListResponse> page = knowledgeBaseArticleService.findPage(1, 10);

        verify(knowledgeBaseArticleRepository).findAll(pageableCaptor.capture());
        Pageable pageable = pageableCaptor.getValue();
        Sort.Order idOrder = pageable.getSort().getOrderFor("id");

        assertThat(pageable.getPageNumber()).isEqualTo(1);
        assertThat(pageable.getPageSize()).isEqualTo(10);
        assertThat(idOrder).isNotNull();
        assertThat(idOrder.getDirection()).isEqualTo(Sort.Direction.DESC);

        assertThat(page.getContent()).hasSize(1);
        assertThat(page.getContent().get(0).articleNo()).isEqualTo("KB-001");
        assertThat(page.getContent().get(0).tags()).containsExactly("가이드", "트러블슈팅");
    }

    @Test
    @DisplayName("생성 시 문서번호/기본 category/viewCount를 설정하고 문자열을 trim한다")
    void create() {
        KnowledgeBaseArticleCreateRequest request = new KnowledgeBaseArticleCreateRequest(
                "  API 가이드  ",
                " ",
                List.of("  backend  ", "", "  api "),
                "  요약  ",
                "  본문  ",
                10L,
                2L
        );

        when(documentNoGenerator.next("KB")).thenReturn("KB-009");
        when(knowledgeBaseArticleRepository.save(any(KnowledgeBaseArticle.class))).thenAnswer(invocation -> {
            KnowledgeBaseArticle row = invocation.getArgument(0);
            row.setId(100L);
            return row;
        });

        Long id = knowledgeBaseArticleService.create(request);

        verify(knowledgeBaseArticleRepository).save(articleCaptor.capture());
        KnowledgeBaseArticle saved = articleCaptor.getValue();

        assertThat(id).isEqualTo(100L);
        assertThat(saved.getArticleNo()).isEqualTo("KB-009");
        assertThat(saved.getCategory()).isEqualTo("기타");
        assertThat(saved.getTitle()).isEqualTo("API 가이드");
        assertThat(saved.getSummary()).isEqualTo("요약");
        assertThat(saved.getContent()).isEqualTo("본문");
        assertThat(saved.getTags()).isEqualTo("[\"backend\",\"api\"]");
        assertThat(saved.getViewCount()).isEqualTo(0);
    }

    @Test
    @DisplayName("수정 시 null이 아닌 필드만 반영하고 category/tags를 정규화한다")
    void update() {
        KnowledgeBaseArticle entity = sampleEntity(7L);
        when(knowledgeBaseArticleRepository.findById(7L)).thenReturn(Optional.of(entity));

        KnowledgeBaseArticleUpdateRequest request = new KnowledgeBaseArticleUpdateRequest(
                "  수정 제목  ",
                " 아키텍처 ",
                List.of("  구조  ", " ", "DDD"),
                null,
                "  수정 본문  "
        );

        knowledgeBaseArticleService.update(7L, request);

        assertThat(entity.getTitle()).isEqualTo("수정 제목");
        assertThat(entity.getCategory()).isEqualTo("아키텍처");
        assertThat(entity.getTags()).isEqualTo("[\"구조\",\"DDD\"]");
        assertThat(entity.getSummary()).isEqualTo("요약");
        assertThat(entity.getContent()).isEqualTo("수정 본문");
    }

    @Test
    @DisplayName("조회수 증가 시 null이면 0으로 보고 1 증가시킨다")
    void increaseViewCount() {
        KnowledgeBaseArticle entity = sampleEntity(7L);
        entity.setViewCount(null);
        when(knowledgeBaseArticleRepository.findById(7L)).thenReturn(Optional.of(entity));

        knowledgeBaseArticleService.increaseViewCount(7L);

        assertThat(entity.getViewCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("생성 시 유효하지 않은 category면 400 예외를 던진다")
    void createBadCategory() {
        KnowledgeBaseArticleCreateRequest request = new KnowledgeBaseArticleCreateRequest(
                "API 가이드",
                "운영노트",
                List.of("api"),
                "요약",
                "본문",
                10L,
                2L
        );

        assertThatThrownBy(() -> knowledgeBaseArticleService.create(request))
                .isInstanceOfSatisfying(ResponseStatusException.class, ex ->
                        assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST)
                );
    }

    private KnowledgeBaseArticle sampleEntity(Long id) {
        KnowledgeBaseArticle entity = new KnowledgeBaseArticle();
        entity.setId(id);
        entity.setArticleNo("KB-001");
        entity.setTeamId(10L);
        entity.setTitle("API 가이드");
        entity.setCategory("개발 가이드");
        entity.setTags("[\"backend\"]");
        entity.setSummary("요약");
        entity.setContent("본문");
        entity.setAuthorId(2L);
        entity.setViewCount(3);
        entity.setCreatedAt(LocalDateTime.of(2026, 2, 25, 10, 0));
        entity.setUpdatedAt(LocalDateTime.of(2026, 2, 25, 10, 0));
        return entity;
    }
}
