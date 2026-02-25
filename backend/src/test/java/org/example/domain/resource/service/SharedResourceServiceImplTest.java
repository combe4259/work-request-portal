package org.example.domain.resource.service;

import org.example.domain.resource.dto.SharedResourceCreateRequest;
import org.example.domain.resource.dto.SharedResourceListResponse;
import org.example.domain.resource.dto.SharedResourceUpdateRequest;
import org.example.domain.resource.entity.SharedResource;
import org.example.domain.resource.repository.SharedResourceRepository;
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
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SharedResourceServiceImplTest {

    @Mock
    private SharedResourceRepository sharedResourceRepository;

    @InjectMocks
    private SharedResourceServiceImpl sharedResourceService;

    @Captor
    private ArgumentCaptor<Pageable> pageableCaptor;

    @Captor
    private ArgumentCaptor<SharedResource> resourceCaptor;

    @Test
    @DisplayName("목록 조회 시 페이징/정렬을 적용하고 리스트 응답으로 매핑한다")
    void findPage() {
        SharedResource entity = sampleEntity(1L);
        when(sharedResourceRepository.findAll(any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(entity)));

        Page<SharedResourceListResponse> page = sharedResourceService.findPage(2, 5);

        verify(sharedResourceRepository).findAll(pageableCaptor.capture());
        Pageable pageable = pageableCaptor.getValue();
        Sort.Order idOrder = pageable.getSort().getOrderFor("id");

        assertThat(pageable.getPageNumber()).isEqualTo(2);
        assertThat(pageable.getPageSize()).isEqualTo(5);
        assertThat(idOrder).isNotNull();
        assertThat(idOrder.getDirection()).isEqualTo(Sort.Direction.DESC);

        assertThat(page.getContent()).hasSize(1);
        assertThat(page.getContent().get(0).id()).isEqualTo(1L);
        assertThat(page.getContent().get(0).title()).isEqualTo("팀 위키");
    }

    @Test
    @DisplayName("생성 시 문자열을 trim하고 기본 category(기타)를 적용한다")
    void create() {
        SharedResourceCreateRequest request = new SharedResourceCreateRequest(
                "  팀 위키  ",
                "  https://example.com/wiki  ",
                " ",
                "  개발 문서 모음  ",
                10L,
                2L
        );

        when(sharedResourceRepository.save(any(SharedResource.class))).thenAnswer(invocation -> {
            SharedResource row = invocation.getArgument(0);
            row.setId(100L);
            return row;
        });

        Long id = sharedResourceService.create(request);

        verify(sharedResourceRepository).save(resourceCaptor.capture());
        SharedResource saved = resourceCaptor.getValue();

        assertThat(id).isEqualTo(100L);
        assertThat(saved.getTitle()).isEqualTo("팀 위키");
        assertThat(saved.getUrl()).isEqualTo("https://example.com/wiki");
        assertThat(saved.getDescription()).isEqualTo("개발 문서 모음");
        assertThat(saved.getCategory()).isEqualTo("기타");
        assertThat(saved.getTeamId()).isEqualTo(10L);
        assertThat(saved.getRegisteredBy()).isEqualTo(2L);
    }

    @Test
    @DisplayName("생성 시 유효하지 않은 category면 400 예외를 던진다")
    void createBadCategory() {
        SharedResourceCreateRequest request = new SharedResourceCreateRequest(
                "팀 위키",
                "https://example.com/wiki",
                "Slack",
                "설명",
                10L,
                2L
        );

        assertThatThrownBy(() -> sharedResourceService.create(request))
                .isInstanceOfSatisfying(ResponseStatusException.class, ex ->
                        assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST)
                );
    }

    @Test
    @DisplayName("수정 시 null이 아닌 필드만 반영하고 문자열을 정리한다")
    void update() {
        SharedResource entity = sampleEntity(7L);
        when(sharedResourceRepository.findById(7L)).thenReturn(Optional.of(entity));

        SharedResourceUpdateRequest request = new SharedResourceUpdateRequest(
                "  수정된 문서  ",
                null,
                " GitHub ",
                "  설명 수정  "
        );

        sharedResourceService.update(7L, request);

        assertThat(entity.getTitle()).isEqualTo("수정된 문서");
        assertThat(entity.getUrl()).isEqualTo("https://example.com/wiki");
        assertThat(entity.getCategory()).isEqualTo("GitHub");
        assertThat(entity.getDescription()).isEqualTo("설명 수정");
    }

    @Test
    @DisplayName("삭제 시 대상을 조회한 뒤 삭제한다")
    void delete() {
        SharedResource entity = sampleEntity(8L);
        when(sharedResourceRepository.findById(8L)).thenReturn(Optional.of(entity));

        sharedResourceService.delete(8L);

        verify(sharedResourceRepository).delete(entity);
    }

    private SharedResource sampleEntity(Long id) {
        SharedResource entity = new SharedResource();
        entity.setId(id);
        entity.setTeamId(10L);
        entity.setTitle("팀 위키");
        entity.setUrl("https://example.com/wiki");
        entity.setCategory("문서");
        entity.setDescription("개발 문서 모음");
        entity.setRegisteredBy(2L);
        entity.setCreatedAt(LocalDateTime.of(2026, 2, 25, 10, 0));
        entity.setUpdatedAt(LocalDateTime.of(2026, 2, 25, 10, 0));
        return entity;
    }
}
