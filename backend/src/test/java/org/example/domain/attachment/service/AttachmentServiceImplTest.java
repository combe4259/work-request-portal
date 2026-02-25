package org.example.domain.attachment.service;

import org.example.domain.attachment.dto.AttachmentCreateRequest;
import org.example.domain.attachment.dto.AttachmentListResponse;
import org.example.domain.attachment.dto.AttachmentUpdateRequest;
import org.example.domain.attachment.entity.Attachment;
import org.example.domain.attachment.repository.AttachmentRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
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
class AttachmentServiceImplTest {

    @Mock
    private AttachmentRepository attachmentRepository;

    @InjectMocks
    private AttachmentServiceImpl attachmentService;

    @Captor
    private ArgumentCaptor<Attachment> attachmentCaptor;

    @Test
    @DisplayName("목록 조회 시 ref 조건으로 조회한다")
    void findList() {
        when(attachmentRepository.findByRefTypeAndRefIdOrderByIdDesc("DEFECT", 77L))
                .thenReturn(List.of(sampleEntity(1L)));

        List<AttachmentListResponse> result = attachmentService.findList("defect", 77L);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).id()).isEqualTo(1L);
        assertThat(result.get(0).refType()).isEqualTo("DEFECT");
    }

    @Test
    @DisplayName("생성 시 필수값을 검증하고 문자열을 trim한다")
    void create() {
        AttachmentCreateRequest request = new AttachmentCreateRequest(
                " work_request ",
                11L,
                "  error-log.txt ",
                "  /files/error-log.txt ",
                2048L,
                " text/plain ",
                2L
        );

        when(attachmentRepository.save(any(Attachment.class))).thenAnswer(invocation -> {
            Attachment row = invocation.getArgument(0);
            row.setId(100L);
            return row;
        });

        Long id = attachmentService.create(request);

        verify(attachmentRepository).save(attachmentCaptor.capture());
        Attachment saved = attachmentCaptor.getValue();

        assertThat(id).isEqualTo(100L);
        assertThat(saved.getRefType()).isEqualTo("WORK_REQUEST");
        assertThat(saved.getRefId()).isEqualTo(11L);
        assertThat(saved.getOriginalName()).isEqualTo("error-log.txt");
        assertThat(saved.getStoredPath()).isEqualTo("/files/error-log.txt");
        assertThat(saved.getMimeType()).isEqualTo("text/plain");
        assertThat(saved.getUploadedBy()).isEqualTo(2L);
    }

    @Test
    @DisplayName("수정 시 전달된 필드만 반영한다")
    void update() {
        Attachment entity = sampleEntity(9L);
        when(attachmentRepository.findById(9L)).thenReturn(Optional.of(entity));

        attachmentService.update(9L, new AttachmentUpdateRequest(
                null,
                null,
                "  renamed.txt  ",
                "  /files/renamed.txt ",
                null,
                " "
        ));

        assertThat(entity.getOriginalName()).isEqualTo("renamed.txt");
        assertThat(entity.getStoredPath()).isEqualTo("/files/renamed.txt");
        assertThat(entity.getMimeType()).isNull();
        assertThat(entity.getRefType()).isEqualTo("DEFECT");
    }

    @Test
    @DisplayName("생성 시 필수값 누락이면 400 예외를 던진다")
    void createBadRequest() {
        AttachmentCreateRequest request = new AttachmentCreateRequest(
                "DEFECT",
                77L,
                "file.txt",
                " ",
                1L,
                null,
                2L
        );

        assertThatThrownBy(() -> attachmentService.create(request))
                .isInstanceOfSatisfying(ResponseStatusException.class, ex ->
                        assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST)
                );
    }

    @Test
    @DisplayName("삭제 시 대상을 조회한 뒤 삭제한다")
    void delete() {
        Attachment entity = sampleEntity(12L);
        when(attachmentRepository.findById(12L)).thenReturn(Optional.of(entity));

        attachmentService.delete(12L);

        verify(attachmentRepository).delete(entity);
    }

    private Attachment sampleEntity(Long id) {
        Attachment entity = new Attachment();
        entity.setId(id);
        entity.setRefType("DEFECT");
        entity.setRefId(77L);
        entity.setOriginalName("capture.png");
        entity.setStoredPath("/files/capture.png");
        entity.setFileSize(4096L);
        entity.setMimeType("image/png");
        entity.setUploadedBy(2L);
        entity.setCreatedAt(LocalDateTime.of(2026, 2, 25, 10, 0));
        return entity;
    }
}
