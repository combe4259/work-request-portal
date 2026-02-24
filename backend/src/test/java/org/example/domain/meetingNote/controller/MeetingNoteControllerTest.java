package org.example.domain.meetingNote.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.domain.meetingNote.dto.MeetingActionItemItemRequest;
import org.example.domain.meetingNote.dto.MeetingActionItemResponse;
import org.example.domain.meetingNote.dto.MeetingActionItemStatusUpdateRequest;
import org.example.domain.meetingNote.dto.MeetingNoteCreateRequest;
import org.example.domain.meetingNote.dto.MeetingNoteDetailResponse;
import org.example.domain.meetingNote.dto.MeetingNoteListResponse;
import org.example.domain.meetingNote.dto.MeetingNoteUpdateRequest;
import org.example.domain.meetingNote.service.MeetingNoteService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(MeetingNoteController.class)
class MeetingNoteControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private MeetingNoteService meetingNoteService;

    @Test
    @DisplayName("회의록 목록 조회는 기본 페이지 파라미터를 사용한다")
    void getMeetingNotesWithDefaultPaging() throws Exception {
        when(meetingNoteService.findPage(0, 20)).thenReturn(new PageImpl<>(
                List.of(listResponse(1L, "MN-0001")),
                PageRequest.of(0, 20),
                1
        ));

        mockMvc.perform(get("/api/meeting-notes"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(1L))
                .andExpect(jsonPath("$.content[0].noteNo").value("MN-0001"))
                .andExpect(jsonPath("$.number").value(0))
                .andExpect(jsonPath("$.size").value(20));

        verify(meetingNoteService).findPage(0, 20);
    }

    @Test
    @DisplayName("회의록 상세 조회 성공")
    void getMeetingNoteSuccess() throws Exception {
        when(meetingNoteService.findById(1L)).thenReturn(detailResponse(1L, "MN-0001", "스프린트 킥오프"));

        mockMvc.perform(get("/api/meeting-notes/{id}", 1L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1L))
                .andExpect(jsonPath("$.title").value("스프린트 킥오프"));

        verify(meetingNoteService).findById(1L);
    }

    @Test
    @DisplayName("회의록 생성 성공")
    void createMeetingNoteSuccess() throws Exception {
        MeetingNoteCreateRequest request = new MeetingNoteCreateRequest(
                "스프린트 킥오프",
                LocalDate.of(2026, 3, 1),
                "회의실 A",
                2L,
                List.of("일정 공유"),
                "회의 내용",
                List.of("우선순위 확정"),
                10L,
                2L,
                List.of(new MeetingActionItemItemRequest("요구사항 정리", 3L, LocalDate.of(2026, 3, 3), "대기", "WORK_REQUEST", 11L))
        );

        when(meetingNoteService.create(eq(request))).thenReturn(7L);

        mockMvc.perform(post("/api/meeting-notes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(7L));

        verify(meetingNoteService).create(eq(request));
    }

    @Test
    @DisplayName("회의록 수정 성공 시 204를 반환한다")
    void updateMeetingNoteSuccess() throws Exception {
        MeetingNoteUpdateRequest request = new MeetingNoteUpdateRequest(
                "제목 수정",
                LocalDate.of(2026, 3, 2),
                "온라인",
                2L,
                List.of("안건 수정"),
                "내용 수정",
                List.of("결정 수정"),
                List.of(new MeetingActionItemItemRequest("QA 점검", 4L, LocalDate.of(2026, 3, 4), "진행중", null, null))
        );

        mockMvc.perform(put("/api/meeting-notes/{id}", 7L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNoContent());

        verify(meetingNoteService).update(eq(7L), eq(request));
    }

    @Test
    @DisplayName("회의 액션 아이템 조회 성공")
    void getActionItemsSuccess() throws Exception {
        when(meetingNoteService.getActionItems(7L)).thenReturn(List.of(
                new MeetingActionItemResponse(1L, "요구사항 정리", 3L, LocalDate.of(2026, 3, 3), "진행중", "WORK_REQUEST", 11L)
        ));

        mockMvc.perform(get("/api/meeting-notes/{id}/action-items", 7L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1L))
                .andExpect(jsonPath("$[0].status").value("진행중"));
    }

    @Test
    @DisplayName("회의 액션 아이템 상태 변경 성공")
    void updateActionItemStatusSuccess() throws Exception {
        MeetingActionItemStatusUpdateRequest request = new MeetingActionItemStatusUpdateRequest("완료");

        mockMvc.perform(patch("/api/meeting-notes/{id}/action-items/{itemId}", 7L, 1L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNoContent());

        verify(meetingNoteService).updateActionItemStatus(eq(7L), eq(1L), eq(request));
    }

    private MeetingNoteListResponse listResponse(Long id, String noteNo) {
        return new MeetingNoteListResponse(
                id,
                noteNo,
                "제목",
                LocalDate.of(2026, 3, 1),
                2L,
                3L,
                1L,
                LocalDateTime.of(2026, 2, 24, 11, 0)
        );
    }

    private MeetingNoteDetailResponse detailResponse(Long id, String noteNo, String title) {
        return new MeetingNoteDetailResponse(
                id,
                noteNo,
                10L,
                title,
                LocalDate.of(2026, 3, 1),
                "회의실 A",
                2L,
                List.of("안건1"),
                "회의 내용",
                List.of("결정1"),
                2L,
                LocalDateTime.of(2026, 2, 24, 11, 0),
                LocalDateTime.of(2026, 2, 24, 11, 0)
        );
    }
}
