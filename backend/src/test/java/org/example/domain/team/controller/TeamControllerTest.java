package org.example.domain.team.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.domain.team.dto.TeamCreateRequest;
import org.example.domain.team.dto.TeamJoinRequest;
import org.example.domain.team.dto.TeamMemberResponse;
import org.example.domain.team.dto.TeamMemberRoleUpdateRequest;
import org.example.domain.team.dto.TeamResponse;
import org.example.domain.team.service.TeamService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(TeamController.class)
class TeamControllerTest {

    private static final String AUTH_HEADER = "Bearer token";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private TeamService teamService;

    @Test
    @DisplayName("내 팀 목록 조회 성공")
    void getMyTeamsSuccess() throws Exception {
        when(teamService.getMyTeams(AUTH_HEADER)).thenReturn(
                List.of(new TeamResponse(1L, "개발팀", "업무 포털", "OWNER", "ABCD1234"))
        );

        mockMvc.perform(get("/api/teams/mine")
                        .header(HttpHeaders.AUTHORIZATION, AUTH_HEADER))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1L))
                .andExpect(jsonPath("$[0].name").value("개발팀"))
                .andExpect(jsonPath("$[0].teamRole").value("OWNER"));

        verify(teamService).getMyTeams(AUTH_HEADER);
    }

    @Test
    @DisplayName("Authorization 헤더 없이 조회 시 서비스 예외가 401로 전파된다")
    void getMyTeamsUnauthorized() throws Exception {
        when(teamService.getMyTeams(null))
                .thenThrow(new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authorization 헤더가 필요합니다."));

        mockMvc.perform(get("/api/teams/mine"))
                .andExpect(status().isUnauthorized());

        verify(teamService).getMyTeams(null);
    }

    @Test
    @DisplayName("팀 생성 성공")
    void createTeamSuccess() throws Exception {
        TeamCreateRequest request = new TeamCreateRequest("플랫폼개발팀", "워크리퀘스트 담당");
        TeamResponse response = new TeamResponse(10L, "플랫폼개발팀", "워크리퀘스트 담당", "OWNER", "QWER1234");

        when(teamService.createTeam(eq(AUTH_HEADER), eq(request))).thenReturn(response);

        mockMvc.perform(post("/api/teams")
                        .header(HttpHeaders.AUTHORIZATION, AUTH_HEADER)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(10L))
                .andExpect(jsonPath("$.name").value("플랫폼개발팀"))
                .andExpect(jsonPath("$.inviteCode").value("QWER1234"));

        verify(teamService).createTeam(eq(AUTH_HEADER), eq(request));
    }

    @Test
    @DisplayName("팀 생성 요청 검증 실패 시 400을 반환한다")
    void createTeamValidationFail() throws Exception {
        TeamCreateRequest invalidRequest = new TeamCreateRequest(" ", "설명");

        mockMvc.perform(post("/api/teams")
                        .header(HttpHeaders.AUTHORIZATION, AUTH_HEADER)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(teamService);
    }

    @Test
    @DisplayName("팀 참여 성공")
    void joinTeamSuccess() throws Exception {
        TeamJoinRequest request = new TeamJoinRequest("ABCD1234");
        TeamResponse response = new TeamResponse(20L, "플랫폼개발팀", null, "MEMBER", "ABCD1234");

        when(teamService.joinTeam(eq(AUTH_HEADER), eq(request))).thenReturn(response);

        mockMvc.perform(post("/api/teams/join")
                        .header(HttpHeaders.AUTHORIZATION, AUTH_HEADER)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(20L))
                .andExpect(jsonPath("$.teamRole").value("MEMBER"));

        verify(teamService).joinTeam(eq(AUTH_HEADER), eq(request));
    }

    @Test
    @DisplayName("팀 참여 요청 검증 실패 시 400을 반환한다")
    void joinTeamValidationFail() throws Exception {
        TeamJoinRequest invalidRequest = new TeamJoinRequest(" ");

        mockMvc.perform(post("/api/teams/join")
                        .header(HttpHeaders.AUTHORIZATION, AUTH_HEADER)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(teamService);
    }

    @Test
    @DisplayName("팀 멤버 조회 성공")
    void getTeamMembersSuccess() throws Exception {
        when(teamService.getTeamMembers(AUTH_HEADER, 3L)).thenReturn(
                List.of(new TeamMemberResponse(2L, "홍길동", "hong@example.com", "MEMBER"))
        );

        mockMvc.perform(get("/api/teams/{teamId}/members", 3L)
                        .header(HttpHeaders.AUTHORIZATION, AUTH_HEADER))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].userId").value(2L))
                .andExpect(jsonPath("$[0].email").value("hong@example.com"));

        verify(teamService).getTeamMembers(AUTH_HEADER, 3L);
    }

    @Test
    @DisplayName("팀 멤버 역할 변경 성공 시 204를 반환한다")
    void updateTeamMemberRoleSuccess() throws Exception {
        TeamMemberRoleUpdateRequest request = new TeamMemberRoleUpdateRequest("ADMIN");

        mockMvc.perform(patch("/api/teams/{teamId}/members/{userId}/role", 3L, 2L)
                        .header(HttpHeaders.AUTHORIZATION, AUTH_HEADER)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNoContent());

        verify(teamService).updateTeamMemberRole(eq(AUTH_HEADER), eq(3L), eq(2L), eq(request));
    }

    @Test
    @DisplayName("팀 멤버 역할 변경 요청 검증 실패 시 400을 반환한다")
    void updateTeamMemberRoleValidationFail() throws Exception {
        TeamMemberRoleUpdateRequest invalidRequest = new TeamMemberRoleUpdateRequest(" ");

        mockMvc.perform(patch("/api/teams/{teamId}/members/{userId}/role", 3L, 2L)
                        .header(HttpHeaders.AUTHORIZATION, AUTH_HEADER)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(teamService);
    }

    @Test
    @DisplayName("팀 멤버 역할 변경 시 서비스 403 예외가 전파된다")
    void updateTeamMemberRoleForbidden() throws Exception {
        TeamMemberRoleUpdateRequest request = new TeamMemberRoleUpdateRequest("OWNER");
        doThrow(new ResponseStatusException(HttpStatus.FORBIDDEN, "권한이 없습니다."))
                .when(teamService).updateTeamMemberRole(eq(AUTH_HEADER), eq(3L), eq(2L), any(TeamMemberRoleUpdateRequest.class));

        mockMvc.perform(patch("/api/teams/{teamId}/members/{userId}/role", 3L, 2L)
                        .header(HttpHeaders.AUTHORIZATION, AUTH_HEADER)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("팀 멤버 제거 성공 시 204를 반환한다")
    void removeTeamMemberSuccess() throws Exception {
        mockMvc.perform(delete("/api/teams/{teamId}/members/{userId}", 3L, 2L)
                        .header(HttpHeaders.AUTHORIZATION, AUTH_HEADER))
                .andExpect(status().isNoContent());

        verify(teamService).removeTeamMember(AUTH_HEADER, 3L, 2L);
    }
}
