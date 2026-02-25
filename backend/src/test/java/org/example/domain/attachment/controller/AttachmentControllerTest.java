package org.example.domain.attachment.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.domain.attachment.dto.AttachmentCreateRequest;
import org.example.domain.attachment.dto.AttachmentDetailResponse;
import org.example.domain.attachment.dto.AttachmentListResponse;
import org.example.domain.attachment.dto.AttachmentUpdateRequest;
import org.example.domain.attachment.service.AttachmentService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AttachmentController.class)
class AttachmentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AttachmentService attachmentService;

    @Test
    @DisplayName("첨부파일 목록 조회는 ref 파라미터를 전달한다")
    void getAttachments() throws Exception {
        when(attachmentService.findList("DEFECT", 77L)).thenReturn(List.of(listResponse(1L)));

        mockMvc.perform(get("/api/attachments")
                        .param("refType", "DEFECT")
                        .param("refId", "77"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1L))
                .andExpect(jsonPath("$[0].originalName").value("capture.png"));

        verify(attachmentService).findList("DEFECT", 77L);
    }

    @Test
    @DisplayName("첨부파일 상세 조회 성공")
    void getAttachment() throws Exception {
        when(attachmentService.findById(1L)).thenReturn(detailResponse(1L));

        mockMvc.perform(get("/api/attachments/{id}", 1L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1L))
                .andExpect(jsonPath("$.refType").value("DEFECT"));

        verify(attachmentService).findById(1L);
    }

    @Test
    @DisplayName("첨부파일 생성 성공")
    void createAttachment() throws Exception {
        AttachmentCreateRequest request = new AttachmentCreateRequest(
                "DEFECT",
                77L,
                "capture.png",
                "/files/capture.png",
                4096L,
                "image/png",
                2L
        );
        when(attachmentService.create(eq(request))).thenReturn(50L);

        mockMvc.perform(post("/api/attachments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(50L));

        verify(attachmentService).create(eq(request));
    }

    @Test
    @DisplayName("첨부파일 수정 성공 시 204를 반환한다")
    void updateAttachment() throws Exception {
        AttachmentUpdateRequest request = new AttachmentUpdateRequest(
                null,
                null,
                "renamed.png",
                "/files/renamed.png",
                5000L,
                "image/png"
        );

        mockMvc.perform(put("/api/attachments/{id}", 50L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNoContent());

        verify(attachmentService).update(eq(50L), eq(request));
    }

    @Test
    @DisplayName("첨부파일 삭제 성공 시 204를 반환한다")
    void deleteAttachment() throws Exception {
        mockMvc.perform(delete("/api/attachments/{id}", 50L))
                .andExpect(status().isNoContent());

        verify(attachmentService).delete(50L);
    }

    private AttachmentListResponse listResponse(Long id) {
        return new AttachmentListResponse(
                id,
                "DEFECT",
                77L,
                "capture.png",
                "/files/capture.png",
                4096L,
                "image/png",
                2L,
                LocalDateTime.of(2026, 2, 25, 10, 0)
        );
    }

    private AttachmentDetailResponse detailResponse(Long id) {
        return new AttachmentDetailResponse(
                id,
                "DEFECT",
                77L,
                "capture.png",
                "/files/capture.png",
                4096L,
                "image/png",
                2L,
                LocalDateTime.of(2026, 2, 25, 10, 0)
        );
    }
}
