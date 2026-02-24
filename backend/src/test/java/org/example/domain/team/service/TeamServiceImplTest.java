package org.example.domain.team.service;

import org.example.domain.team.dto.TeamCreateRequest;
import org.example.domain.team.dto.TeamJoinRequest;
import org.example.domain.team.dto.TeamMemberResponse;
import org.example.domain.team.dto.TeamMemberRoleUpdateRequest;
import org.example.domain.team.dto.TeamResponse;
import org.example.domain.team.entity.Team;
import org.example.domain.team.entity.UserTeam;
import org.example.domain.team.repository.TeamRepository;
import org.example.domain.team.repository.UserTeamRepository;
import org.example.domain.user.entity.PortalUser;
import org.example.domain.user.repository.PortalUserRepository;
import org.example.global.security.JwtTokenProvider;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TeamServiceImplTest {

    private static final String AUTH_HEADER = "Bearer token";

    @Mock
    private TeamRepository teamRepository;

    @Mock
    private UserTeamRepository userTeamRepository;

    @Mock
    private PortalUserRepository portalUserRepository;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @InjectMocks
    private TeamServiceImpl teamService;

    @Test
    @DisplayName("팀 생성 성공 시 팀과 OWNER 소속을 생성한다")
    void createTeamSuccess() {
        mockActiveRequester(1L);
        when(teamRepository.existsByInviteCode(anyString())).thenReturn(false);
        when(teamRepository.save(any(Team.class))).thenAnswer(invocation -> {
            Team team = invocation.getArgument(0);
            team.setId(10L);
            return team;
        });
        when(userTeamRepository.save(any(UserTeam.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TeamResponse response = teamService.createTeam(AUTH_HEADER, new TeamCreateRequest("플랫폼개발부", "업무 포털 담당"));

        assertEquals(10L, response.id());
        assertEquals("플랫폼개발부", response.name());
        assertEquals("OWNER", response.teamRole());
        assertNotNull(response.inviteCode());
        assertTrue(response.inviteCode().length() >= 8);

        ArgumentCaptor<UserTeam> membershipCaptor = ArgumentCaptor.forClass(UserTeam.class);
        verify(userTeamRepository).save(membershipCaptor.capture());
        assertEquals(1L, membershipCaptor.getValue().getUserId());
        assertEquals(10L, membershipCaptor.getValue().getTeamId());
        assertEquals("OWNER", membershipCaptor.getValue().getTeamRole());
    }

    @Test
    @DisplayName("팀 생성 시 이름/설명 trim 및 빈 설명은 null 처리한다")
    void createTeamTrimAndNormalizeDescription() {
        mockActiveRequester(1L);
        when(teamRepository.existsByInviteCode(anyString())).thenReturn(false);
        when(teamRepository.save(any(Team.class))).thenAnswer(invocation -> {
            Team team = invocation.getArgument(0);
            team.setId(10L);
            return team;
        });

        teamService.createTeam(AUTH_HEADER, new TeamCreateRequest("  개발팀  ", "   "));

        ArgumentCaptor<Team> teamCaptor = ArgumentCaptor.forClass(Team.class);
        verify(teamRepository).save(teamCaptor.capture());
        assertEquals("개발팀", teamCaptor.getValue().getName());
        assertNull(teamCaptor.getValue().getDescription());
    }

    @Test
    @DisplayName("Authorization 헤더가 없으면 401을 반환한다")
    void unauthorizedWhenAuthorizationHeaderMissing() {
        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> teamService.createTeam(null, new TeamCreateRequest("개발팀", null))
        );

        assertEquals(HttpStatus.UNAUTHORIZED, exception.getStatusCode());
        verifyNoInteractions(portalUserRepository);
    }

    @Test
    @DisplayName("비활성 사용자는 팀 생성 시 403을 반환한다")
    void createTeamInactiveUserForbidden() {
        mockInactiveRequester(1L);

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> teamService.createTeam(AUTH_HEADER, new TeamCreateRequest("개발팀", null))
        );

        assertEquals(HttpStatus.FORBIDDEN, exception.getStatusCode());
        verifyNoInteractions(teamRepository);
    }

    @Test
    @DisplayName("팀 이름이 비어 있으면 400을 반환한다")
    void createTeamNameRequired() {
        mockActiveRequester(1L);

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> teamService.createTeam(AUTH_HEADER, new TeamCreateRequest("   ", null))
        );

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        verifyNoInteractions(teamRepository);
    }

    @Test
    @DisplayName("팀 참여 성공 시 MEMBER 소속을 생성한다")
    void joinTeamSuccess() {
        mockActiveRequester(1L);
        Team team = team(20L, "기존팀", "ABCD1234");

        when(teamRepository.findByInviteCode("ABCD1234")).thenReturn(Optional.of(team));
        when(userTeamRepository.existsByUserIdAndTeamId(1L, 20L)).thenReturn(false);

        TeamResponse response = teamService.joinTeam(AUTH_HEADER, new TeamJoinRequest("abcd1234"));

        assertEquals(20L, response.id());
        assertEquals("기존팀", response.name());
        assertEquals("MEMBER", response.teamRole());

        ArgumentCaptor<UserTeam> captor = ArgumentCaptor.forClass(UserTeam.class);
        verify(userTeamRepository).save(captor.capture());
        assertEquals(1L, captor.getValue().getUserId());
        assertEquals(20L, captor.getValue().getTeamId());
        assertEquals("MEMBER", captor.getValue().getTeamRole());
    }

    @Test
    @DisplayName("팀 참여 시 초대코드가 비어 있으면 400")
    void joinTeamInviteCodeRequired() {
        mockActiveRequester(1L);

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> teamService.joinTeam(AUTH_HEADER, new TeamJoinRequest("   "))
        );

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        verify(teamRepository, never()).findByInviteCode(anyString());
    }

    @Test
    @DisplayName("존재하지 않는 초대코드는 404")
    void joinTeamInviteCodeNotFound() {
        mockActiveRequester(1L);
        when(teamRepository.findByInviteCode("ABCD1234")).thenReturn(Optional.empty());

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> teamService.joinTeam(AUTH_HEADER, new TeamJoinRequest("ABCD1234"))
        );

        assertEquals(HttpStatus.NOT_FOUND, exception.getStatusCode());
    }

    @Test
    @DisplayName("이미 참여 중인 팀이면 팀 참여 시 409")
    void joinTeamAlreadyJoined() {
        mockActiveRequester(1L);
        Team team = team(20L, "기존팀", "ABCD1234");

        when(teamRepository.findByInviteCode("ABCD1234")).thenReturn(Optional.of(team));
        when(userTeamRepository.existsByUserIdAndTeamId(1L, 20L)).thenReturn(true);

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> teamService.joinTeam(AUTH_HEADER, new TeamJoinRequest("ABCD1234"))
        );

        assertEquals(HttpStatus.CONFLICT, exception.getStatusCode());
    }

    @Test
    @DisplayName("내 팀 조회는 소속이 없으면 빈 목록을 반환한다")
    void getMyTeamsEmpty() {
        mockActiveRequester(1L);
        when(userTeamRepository.findByUserId(1L)).thenReturn(List.of());

        List<TeamResponse> teams = teamService.getMyTeams(AUTH_HEADER);

        assertTrue(teams.isEmpty());
        verify(teamRepository, never()).findAllById(any());
    }

    @Test
    @DisplayName("내 팀 조회는 팀 정보가 누락된 소속을 제외한다")
    void getMyTeamsSkipUnknownTeam() {
        mockActiveRequester(1L);
        UserTeam membership = membership(1L, 30L, "ADMIN");
        when(userTeamRepository.findByUserId(1L)).thenReturn(List.of(membership));
        when(teamRepository.findAllById(List.of(30L))).thenReturn(List.of());

        List<TeamResponse> teams = teamService.getMyTeams(AUTH_HEADER);

        assertTrue(teams.isEmpty());
    }

    @Test
    @DisplayName("팀 멤버 조회는 teamId가 null이면 400")
    void getTeamMembersRequiresTeamId() {
        mockActiveRequester(1L);

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> teamService.getTeamMembers(AUTH_HEADER, null)
        );

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
    }

    @Test
    @DisplayName("팀 멤버 조회 시 요청자가 팀 소속이 아니면 403")
    void getTeamMembersForbidden() {
        mockActiveRequester(1L);
        when(userTeamRepository.existsByUserIdAndTeamId(1L, 99L)).thenReturn(false);

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> teamService.getTeamMembers(AUTH_HEADER, 99L)
        );

        assertEquals(HttpStatus.FORBIDDEN, exception.getStatusCode());
    }

    @Test
    @DisplayName("팀 멤버 조회 성공 시 사용자 정보와 팀 역할을 반환한다")
    void getTeamMembersSuccess() {
        mockActiveRequester(1L);
        PortalUser memberUser = activeUser(2L, "member@example.com");
        memberUser.setName("팀원");

        when(userTeamRepository.existsByUserIdAndTeamId(1L, 77L)).thenReturn(true);
        when(userTeamRepository.findByTeamId(77L)).thenReturn(List.of(membership(2L, 77L, "MEMBER")));
        when(portalUserRepository.findAllById(List.of(2L))).thenReturn(List.of(memberUser));

        List<TeamMemberResponse> members = teamService.getTeamMembers(AUTH_HEADER, 77L);

        assertEquals(1, members.size());
        assertEquals(2L, members.get(0).userId());
        assertEquals("팀원", members.get(0).name());
        assertEquals("MEMBER", members.get(0).teamRole());
    }

    @Test
    @DisplayName("팀 멤버 역할 변경 성공")
    void updateTeamMemberRoleSuccess() {
        mockActiveRequester(1L);
        when(userTeamRepository.findByUserIdAndTeamId(1L, 77L)).thenReturn(Optional.of(membership(1L, 77L, "OWNER")));

        UserTeam target = membership(2L, 77L, "MEMBER");
        when(userTeamRepository.findByUserIdAndTeamId(2L, 77L)).thenReturn(Optional.of(target));

        teamService.updateTeamMemberRole(AUTH_HEADER, 77L, 2L, new TeamMemberRoleUpdateRequest("admin"));

        assertEquals("ADMIN", target.getTeamRole());
    }

    @Test
    @DisplayName("팀 멤버 역할 변경 시 관리자 권한이 없으면 403")
    void updateTeamMemberRoleRequesterNotManager() {
        mockActiveRequester(1L);
        when(userTeamRepository.findByUserIdAndTeamId(1L, 77L)).thenReturn(Optional.of(membership(1L, 77L, "MEMBER")));

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> teamService.updateTeamMemberRole(AUTH_HEADER, 77L, 2L, new TeamMemberRoleUpdateRequest("ADMIN"))
        );

        assertEquals(HttpStatus.FORBIDDEN, exception.getStatusCode());
    }

    @Test
    @DisplayName("팀 멤버 역할 변경 시 대상 멤버가 없으면 404")
    void updateTeamMemberRoleTargetNotFound() {
        mockActiveRequester(1L);
        when(userTeamRepository.findByUserIdAndTeamId(1L, 77L)).thenReturn(Optional.of(membership(1L, 77L, "OWNER")));
        when(userTeamRepository.findByUserIdAndTeamId(2L, 77L)).thenReturn(Optional.empty());

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> teamService.updateTeamMemberRole(AUTH_HEADER, 77L, 2L, new TeamMemberRoleUpdateRequest("ADMIN"))
        );

        assertEquals(HttpStatus.NOT_FOUND, exception.getStatusCode());
    }

    @Test
    @DisplayName("팀 멤버 역할 변경 시 유효하지 않은 역할이면 400")
    void updateTeamMemberRoleInvalidRole() {
        mockActiveRequester(1L);
        when(userTeamRepository.findByUserIdAndTeamId(1L, 77L)).thenReturn(Optional.of(membership(1L, 77L, "OWNER")));
        when(userTeamRepository.findByUserIdAndTeamId(2L, 77L)).thenReturn(Optional.of(membership(2L, 77L, "MEMBER")));

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> teamService.updateTeamMemberRole(AUTH_HEADER, 77L, 2L, new TeamMemberRoleUpdateRequest("INVALID"))
        );

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
    }

    @Test
    @DisplayName("ADMIN은 OWNER 권한을 변경할 수 없다")
    void updateOwnerRoleByAdminForbidden() {
        mockActiveRequester(1L);
        when(userTeamRepository.findByUserIdAndTeamId(1L, 77L)).thenReturn(Optional.of(membership(1L, 77L, "ADMIN")));
        when(userTeamRepository.findByUserIdAndTeamId(2L, 77L)).thenReturn(Optional.of(membership(2L, 77L, "OWNER")));

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> teamService.updateTeamMemberRole(AUTH_HEADER, 77L, 2L, new TeamMemberRoleUpdateRequest("MEMBER"))
        );

        assertEquals(HttpStatus.FORBIDDEN, exception.getStatusCode());
    }

    @Test
    @DisplayName("ADMIN은 OWNER 권한을 부여할 수 없다")
    void assignOwnerByAdminForbidden() {
        mockActiveRequester(1L);
        when(userTeamRepository.findByUserIdAndTeamId(1L, 77L)).thenReturn(Optional.of(membership(1L, 77L, "ADMIN")));
        when(userTeamRepository.findByUserIdAndTeamId(2L, 77L)).thenReturn(Optional.of(membership(2L, 77L, "MEMBER")));

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> teamService.updateTeamMemberRole(AUTH_HEADER, 77L, 2L, new TeamMemberRoleUpdateRequest("OWNER"))
        );

        assertEquals(HttpStatus.FORBIDDEN, exception.getStatusCode());
    }

    @Test
    @DisplayName("팀 멤버 제거 성공")
    void removeTeamMemberSuccess() {
        mockActiveRequester(1L);
        when(userTeamRepository.findByUserIdAndTeamId(1L, 77L)).thenReturn(Optional.of(membership(1L, 77L, "OWNER")));
        when(userTeamRepository.findByUserIdAndTeamId(2L, 77L)).thenReturn(Optional.of(membership(2L, 77L, "MEMBER")));

        teamService.removeTeamMember(AUTH_HEADER, 77L, 2L);

        verify(userTeamRepository).deleteByUserIdAndTeamId(2L, 77L);
    }

    @Test
    @DisplayName("팀 멤버 제거 시 자기 자신이면 400")
    void removeTeamMemberSelfBadRequest() {
        mockActiveRequester(1L);

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> teamService.removeTeamMember(AUTH_HEADER, 77L, 1L)
        );

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        verify(userTeamRepository, never()).deleteByUserIdAndTeamId(1L, 77L);
    }

    @Test
    @DisplayName("팀 멤버 제거 시 관리자 권한이 없으면 403")
    void removeTeamMemberRequesterNotManager() {
        mockActiveRequester(1L);
        when(userTeamRepository.findByUserIdAndTeamId(1L, 77L)).thenReturn(Optional.of(membership(1L, 77L, "MEMBER")));

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> teamService.removeTeamMember(AUTH_HEADER, 77L, 2L)
        );

        assertEquals(HttpStatus.FORBIDDEN, exception.getStatusCode());
    }

    @Test
    @DisplayName("팀 멤버 제거 시 대상 멤버가 없으면 404")
    void removeTeamMemberTargetNotFound() {
        mockActiveRequester(1L);
        when(userTeamRepository.findByUserIdAndTeamId(1L, 77L)).thenReturn(Optional.of(membership(1L, 77L, "OWNER")));
        when(userTeamRepository.findByUserIdAndTeamId(2L, 77L)).thenReturn(Optional.empty());

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> teamService.removeTeamMember(AUTH_HEADER, 77L, 2L)
        );

        assertEquals(HttpStatus.NOT_FOUND, exception.getStatusCode());
    }

    @Test
    @DisplayName("ADMIN은 OWNER를 제거할 수 없다")
    void removeOwnerByAdminForbidden() {
        mockActiveRequester(1L);
        when(userTeamRepository.findByUserIdAndTeamId(1L, 77L)).thenReturn(Optional.of(membership(1L, 77L, "ADMIN")));
        when(userTeamRepository.findByUserIdAndTeamId(2L, 77L)).thenReturn(Optional.of(membership(2L, 77L, "OWNER")));

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> teamService.removeTeamMember(AUTH_HEADER, 77L, 2L)
        );

        assertEquals(HttpStatus.FORBIDDEN, exception.getStatusCode());
    }

    @Test
    @DisplayName("팀 멤버 제거 시 teamId가 null이면 400")
    void removeTeamMemberRequiresTeamId() {
        mockActiveRequester(1L);

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> teamService.removeTeamMember(AUTH_HEADER, null, 2L)
        );

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
    }

    @Test
    @DisplayName("팀 멤버 제거 시 userId가 null이면 400")
    void removeTeamMemberRequiresUserId() {
        mockActiveRequester(1L);

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> teamService.removeTeamMember(AUTH_HEADER, 77L, null)
        );

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
    }

    private void mockActiveRequester(Long userId) {
        when(jwtTokenProvider.extractUserId("token")).thenReturn(userId);
        when(portalUserRepository.findById(userId)).thenReturn(Optional.of(activeUser(userId, "user" + userId + "@example.com")));
    }

    private void mockInactiveRequester(Long userId) {
        PortalUser user = activeUser(userId, "user" + userId + "@example.com");
        user.setIsActive(false);
        when(jwtTokenProvider.extractUserId("token")).thenReturn(userId);
        when(portalUserRepository.findById(userId)).thenReturn(Optional.of(user));
    }

    private Team team(Long id, String name, String inviteCode) {
        Team team = new Team();
        team.setId(id);
        team.setName(name);
        team.setInviteCode(inviteCode);
        return team;
    }

    private UserTeam membership(Long userId, Long teamId, String role) {
        UserTeam membership = new UserTeam();
        membership.setUserId(userId);
        membership.setTeamId(teamId);
        membership.setTeamRole(role);
        return membership;
    }

    private PortalUser activeUser(Long id, String email) {
        PortalUser user = new PortalUser();
        user.setId(id);
        user.setName("사용자");
        user.setEmail(email);
        user.setRole("DEVELOPER");
        user.setIsActive(true);
        return user;
    }
}
