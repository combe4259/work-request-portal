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
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TeamServiceImplTest {

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
        PortalUser user = activeUser(1L, "me@example.com");
        when(jwtTokenProvider.extractUserId("token")).thenReturn(1L);
        when(portalUserRepository.findById(1L)).thenReturn(Optional.of(user));
        when(teamRepository.existsByInviteCode(anyString())).thenReturn(false);
        when(teamRepository.save(any(Team.class))).thenAnswer(invocation -> {
            Team team = invocation.getArgument(0);
            team.setId(10L);
            return team;
        });
        when(userTeamRepository.save(any(UserTeam.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TeamResponse response = teamService.createTeam("Bearer token", new TeamCreateRequest("플랫폼개발부", "업무 포털 담당"));

        assertEquals(10L, response.id());
        assertEquals("플랫폼개발부", response.name());
        assertEquals("OWNER", response.teamRole());
        assertNotNull(response.inviteCode());
        assertFalse(response.inviteCode().isBlank());

        ArgumentCaptor<UserTeam> captor = ArgumentCaptor.forClass(UserTeam.class);
        verify(userTeamRepository).save(captor.capture());
        assertEquals(1L, captor.getValue().getUserId());
        assertEquals(10L, captor.getValue().getTeamId());
        assertEquals("OWNER", captor.getValue().getTeamRole());
    }

    @Test
    @DisplayName("팀 참여 성공 시 MEMBER 소속을 생성한다")
    void joinTeamSuccess() {
        PortalUser user = activeUser(1L, "me@example.com");
        Team team = new Team();
        team.setId(20L);
        team.setName("기존팀");
        team.setInviteCode("ABCD1234");

        when(jwtTokenProvider.extractUserId("token")).thenReturn(1L);
        when(portalUserRepository.findById(1L)).thenReturn(Optional.of(user));
        when(teamRepository.findByInviteCode("ABCD1234")).thenReturn(Optional.of(team));
        when(userTeamRepository.existsByUserIdAndTeamId(1L, 20L)).thenReturn(false);

        TeamResponse response = teamService.joinTeam("Bearer token", new TeamJoinRequest("abcd1234"));

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
    @DisplayName("이미 참여 중인 팀이면 팀 참여 시 409를 반환한다")
    void joinTeamAlreadyJoined() {
        PortalUser user = activeUser(1L, "me@example.com");
        Team team = new Team();
        team.setId(20L);
        team.setInviteCode("ABCD1234");

        when(jwtTokenProvider.extractUserId("token")).thenReturn(1L);
        when(portalUserRepository.findById(1L)).thenReturn(Optional.of(user));
        when(teamRepository.findByInviteCode("ABCD1234")).thenReturn(Optional.of(team));
        when(userTeamRepository.existsByUserIdAndTeamId(1L, 20L)).thenReturn(true);

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> teamService.joinTeam("Bearer token", new TeamJoinRequest("ABCD1234"))
        );

        assertEquals(HttpStatus.CONFLICT, exception.getStatusCode());
    }

    @Test
    @DisplayName("내 팀 조회 시 소속 팀 목록을 반환한다")
    void getMyTeams() {
        PortalUser user = activeUser(1L, "me@example.com");
        Team team = new Team();
        team.setId(30L);
        team.setName("제품개발팀");
        team.setDescription("desc");
        team.setInviteCode("QWER1234");

        UserTeam membership = new UserTeam();
        membership.setUserId(1L);
        membership.setTeamId(30L);
        membership.setTeamRole("ADMIN");

        when(jwtTokenProvider.extractUserId("token")).thenReturn(1L);
        when(portalUserRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userTeamRepository.findByUserId(1L)).thenReturn(List.of(membership));
        when(teamRepository.findAllById(List.of(30L))).thenReturn(List.of(team));

        List<TeamResponse> teams = teamService.getMyTeams("Bearer token");

        assertEquals(1, teams.size());
        assertEquals(30L, teams.get(0).id());
        assertEquals("ADMIN", teams.get(0).teamRole());
    }

    @Test
    @DisplayName("팀 멤버 조회 시 요청자가 팀 소속이 아니면 403을 반환한다")
    void getTeamMembersForbidden() {
        PortalUser user = activeUser(1L, "me@example.com");

        when(jwtTokenProvider.extractUserId("token")).thenReturn(1L);
        when(portalUserRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userTeamRepository.existsByUserIdAndTeamId(1L, 99L)).thenReturn(false);

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> teamService.getTeamMembers("Bearer token", 99L)
        );

        assertEquals(HttpStatus.FORBIDDEN, exception.getStatusCode());
    }

    @Test
    @DisplayName("팀 멤버 조회 성공 시 사용자 정보와 팀 역할을 함께 반환한다")
    void getTeamMembersSuccess() {
        PortalUser requester = activeUser(1L, "me@example.com");
        PortalUser memberUser = activeUser(2L, "member@example.com");
        memberUser.setName("팀원");

        UserTeam membership = new UserTeam();
        membership.setUserId(2L);
        membership.setTeamId(77L);
        membership.setTeamRole("MEMBER");

        when(jwtTokenProvider.extractUserId("token")).thenReturn(1L);
        when(portalUserRepository.findById(1L)).thenReturn(Optional.of(requester));
        when(userTeamRepository.existsByUserIdAndTeamId(1L, 77L)).thenReturn(true);
        when(userTeamRepository.findByTeamId(77L)).thenReturn(List.of(membership));
        when(portalUserRepository.findAllById(List.of(2L))).thenReturn(List.of(memberUser));

        List<TeamMemberResponse> members = teamService.getTeamMembers("Bearer token", 77L);

        assertEquals(1, members.size());
        assertEquals(2L, members.get(0).userId());
        assertEquals("팀원", members.get(0).name());
        assertEquals("MEMBER", members.get(0).teamRole());
    }

    @Test
    @DisplayName("팀 멤버 역할 변경 성공")
    void updateTeamMemberRoleSuccess() {
        PortalUser owner = activeUser(1L, "owner@example.com");

        UserTeam requester = new UserTeam();
        requester.setUserId(1L);
        requester.setTeamId(77L);
        requester.setTeamRole("OWNER");

        UserTeam target = new UserTeam();
        target.setUserId(2L);
        target.setTeamId(77L);
        target.setTeamRole("MEMBER");

        when(jwtTokenProvider.extractUserId("token")).thenReturn(1L);
        when(portalUserRepository.findById(1L)).thenReturn(Optional.of(owner));
        when(userTeamRepository.findByUserIdAndTeamId(1L, 77L)).thenReturn(Optional.of(requester));
        when(userTeamRepository.findByUserIdAndTeamId(2L, 77L)).thenReturn(Optional.of(target));

        teamService.updateTeamMemberRole("Bearer token", 77L, 2L, new TeamMemberRoleUpdateRequest("admin"));

        assertEquals("ADMIN", target.getTeamRole());
    }

    @Test
    @DisplayName("팀 멤버 제거 성공")
    void removeTeamMemberSuccess() {
        PortalUser owner = activeUser(1L, "owner@example.com");

        UserTeam requester = new UserTeam();
        requester.setUserId(1L);
        requester.setTeamId(77L);
        requester.setTeamRole("OWNER");

        UserTeam target = new UserTeam();
        target.setUserId(2L);
        target.setTeamId(77L);
        target.setTeamRole("MEMBER");

        when(jwtTokenProvider.extractUserId("token")).thenReturn(1L);
        when(portalUserRepository.findById(1L)).thenReturn(Optional.of(owner));
        when(userTeamRepository.findByUserIdAndTeamId(1L, 77L)).thenReturn(Optional.of(requester));
        when(userTeamRepository.findByUserIdAndTeamId(2L, 77L)).thenReturn(Optional.of(target));

        teamService.removeTeamMember("Bearer token", 77L, 2L);

        verify(userTeamRepository).deleteByUserIdAndTeamId(2L, 77L);
    }

    @Test
    @DisplayName("팀 멤버 제거 시 자기 자신이면 400")
    void removeTeamMemberSelfBadRequest() {
        PortalUser owner = activeUser(1L, "owner@example.com");

        when(jwtTokenProvider.extractUserId("token")).thenReturn(1L);
        when(portalUserRepository.findById(1L)).thenReturn(Optional.of(owner));

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> teamService.removeTeamMember("Bearer token", 77L, 1L)
        );

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        verify(userTeamRepository, never()).deleteByUserIdAndTeamId(1L, 77L);
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
