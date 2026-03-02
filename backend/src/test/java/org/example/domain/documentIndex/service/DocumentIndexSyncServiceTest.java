package org.example.domain.documentIndex.service;

import org.example.domain.documentIndex.entity.DocumentIndex;
import org.example.domain.documentIndex.repository.DocumentIndexRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DocumentIndexSyncServiceTest {

    @Mock
    private DocumentIndexRepository documentIndexRepository;

    @InjectMocks
    private DocumentIndexSyncService documentIndexSyncService;

    @Captor
    private ArgumentCaptor<DocumentIndex> indexCaptor;

    @Test
    @DisplayName("upsert 시 기존 인덱스가 없으면 새로 생성한다")
    void upsertCreatesNew() {
        when(documentIndexRepository.findByTeamIdAndRefTypeAndRefId(10L, "WORK_REQUEST", 5L))
                .thenReturn(Optional.empty());
        when(documentIndexRepository.save(any(DocumentIndex.class))).thenAnswer(i -> i.getArgument(0));

        documentIndexSyncService.upsert("work_request", 5L, 10L, "WR-005", "업무요청 제목", "접수대기");

        verify(documentIndexRepository).save(indexCaptor.capture());
        DocumentIndex saved = indexCaptor.getValue();

        assertThat(saved.getTeamId()).isEqualTo(10L);
        assertThat(saved.getRefType()).isEqualTo("WORK_REQUEST");
        assertThat(saved.getRefId()).isEqualTo(5L);
        assertThat(saved.getDocNo()).isEqualTo("WR-005");
        assertThat(saved.getTitle()).isEqualTo("업무요청 제목");
        assertThat(saved.getStatus()).isEqualTo("접수대기");
    }

    @Test
    @DisplayName("upsert 시 기존 인덱스가 있으면 업데이트한다")
    void upsertUpdatesExisting() {
        DocumentIndex existing = new DocumentIndex();
        existing.setId(1L);
        existing.setTeamId(10L);
        existing.setRefType("WORK_REQUEST");
        existing.setRefId(5L);
        existing.setDocNo("WR-005");
        existing.setTitle("기존 제목");
        existing.setStatus("검토중");

        when(documentIndexRepository.findByTeamIdAndRefTypeAndRefId(10L, "WORK_REQUEST", 5L))
                .thenReturn(Optional.of(existing));
        when(documentIndexRepository.save(any(DocumentIndex.class))).thenAnswer(i -> i.getArgument(0));

        documentIndexSyncService.upsert("WORK_REQUEST", 5L, 10L, "WR-005", "수정된 제목", "완료");

        verify(documentIndexRepository).save(indexCaptor.capture());
        DocumentIndex saved = indexCaptor.getValue();

        assertThat(saved.getId()).isEqualTo(1L);
        assertThat(saved.getTitle()).isEqualTo("수정된 제목");
        assertThat(saved.getStatus()).isEqualTo("완료");
    }

    @Test
    @DisplayName("upsert 시 status가 null이면 null로 저장한다")
    void upsertWithNullStatus() {
        when(documentIndexRepository.findByTeamIdAndRefTypeAndRefId(10L, "DEFECT", 7L))
                .thenReturn(Optional.empty());
        when(documentIndexRepository.save(any(DocumentIndex.class))).thenAnswer(i -> i.getArgument(0));

        documentIndexSyncService.upsert("DEFECT", 7L, 10L, "DF-007", "결함 제목", null);

        verify(documentIndexRepository).save(indexCaptor.capture());
        assertThat(indexCaptor.getValue().getStatus()).isNull();
    }

    @Test
    @DisplayName("upsert 시 refId가 null이면 저장하지 않고 조용히 반환한다")
    void upsertWithNullRefId() {
        documentIndexSyncService.upsert("WORK_REQUEST", null, 10L, "WR-005", "제목", "상태");

        verify(documentIndexRepository, never()).save(any());
    }

    @Test
    @DisplayName("upsert 시 유효하지 않은 refType이면 저장하지 않고 조용히 반환한다")
    void upsertWithInvalidRefType() {
        documentIndexSyncService.upsert("INVALID_TYPE", 5L, 10L, "XX-005", "제목", "상태");

        verify(documentIndexRepository, never()).save(any());
    }

    @Test
    @DisplayName("upsert 시 title이 blank이면 저장하지 않고 조용히 반환한다")
    void upsertWithBlankTitle() {
        documentIndexSyncService.upsert("WORK_REQUEST", 5L, 10L, "WR-005", "  ", "상태");

        verify(documentIndexRepository, never()).save(any());
    }

    @Test
    @DisplayName("delete 시 해당 인덱스를 삭제한다")
    void delete() {
        documentIndexSyncService.delete("TECH_TASK", 3L, 10L);

        verify(documentIndexRepository).deleteByTeamIdAndRefTypeAndRefId(10L, "TECH_TASK", 3L);
    }

    @Test
    @DisplayName("delete 시 refType을 대문자로 정규화하여 삭제한다")
    void deleteNormalizesRefType() {
        documentIndexSyncService.delete("tech_task", 3L, 10L);

        verify(documentIndexRepository).deleteByTeamIdAndRefTypeAndRefId(eq(10L), eq("TECH_TASK"), eq(3L));
    }

    @Test
    @DisplayName("delete 시 refId가 null이면 삭제하지 않고 조용히 반환한다")
    void deleteWithNullRefId() {
        documentIndexSyncService.delete("WORK_REQUEST", null, 10L);

        verify(documentIndexRepository, never()).deleteByTeamIdAndRefTypeAndRefId(any(), any(), any());
    }

    @Test
    @DisplayName("delete 시 유효하지 않은 refType이면 삭제하지 않고 조용히 반환한다")
    void deleteWithInvalidRefType() {
        documentIndexSyncService.delete("INVALID", 5L, 10L);

        verify(documentIndexRepository, never()).deleteByTeamIdAndRefTypeAndRefId(any(), any(), any());
    }
}
