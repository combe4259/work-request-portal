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
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

@Service
@Transactional(readOnly = true)
public class TeamServiceImpl implements TeamService {

    private static final String OWNER_ROLE = "OWNER";
    private static final String ADMIN_ROLE = "ADMIN";
    private static final String MEMBER_ROLE = "MEMBER";

    private final TeamRepository teamRepository;
    private final UserTeamRepository userTeamRepository;
    private final PortalUserRepository portalUserRepository;
    private final JwtTokenProvider jwtTokenProvider;

    public TeamServiceImpl(
            TeamRepository teamRepository,
            UserTeamRepository userTeamRepository,
            PortalUserRepository portalUserRepository,
            JwtTokenProvider jwtTokenProvider
    ) {
        this.teamRepository = teamRepository;
        this.userTeamRepository = userTeamRepository;
        this.portalUserRepository = portalUserRepository;
        this.jwtTokenProvider = jwtTokenProvider;
    }

    @Override
    public List<TeamResponse> getMyTeams(String authorizationHeader) {
        Long userId = extractUserId(authorizationHeader);
        ensureActiveUser(userId);

        List<UserTeam> memberships = userTeamRepository.findByUserId(userId);
        if (memberships.isEmpty()) {
            return List.of();
        }

        Map<Long, Team> teamById = new HashMap<>();
        List<Long> teamIds = memberships.stream().map(UserTeam::getTeamId).distinct().toList();
        for (Team team : teamRepository.findAllById(teamIds)) {
            teamById.put(team.getId(), team);
        }

        List<TeamResponse> result = new ArrayList<>();
        for (UserTeam membership : memberships) {
            Team team = teamById.get(membership.getTeamId());
            if (team != null) {
                result.add(toResponse(team, membership.getTeamRole()));
            }
        }
        return result;
    }

    @Override
    @Transactional
    public TeamResponse createTeam(String authorizationHeader, TeamCreateRequest request) {
        Long userId = extractUserId(authorizationHeader);
        ensureActiveUser(userId);

        if (request == null || isBlank(request.name())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "팀 이름은 필수입니다.");
        }

        Team team = new Team();
        team.setName(request.name().trim());
        team.setDescription(normalizeDescription(request.description()));
        team.setInviteCode(generateInviteCode());
        team.setCreatedBy(userId);

        Team savedTeam = teamRepository.save(team);

        UserTeam membership = new UserTeam();
        membership.setUserId(userId);
        membership.setTeamId(savedTeam.getId());
        membership.setTeamRole(OWNER_ROLE);
        userTeamRepository.save(membership);

        return toResponse(savedTeam, OWNER_ROLE);
    }

    @Override
    @Transactional
    public TeamResponse joinTeam(String authorizationHeader, TeamJoinRequest request) {
        Long userId = extractUserId(authorizationHeader);
        ensureActiveUser(userId);

        if (request == null || isBlank(request.inviteCode())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "초대 코드를 입력해주세요.");
        }

        String inviteCode = request.inviteCode().trim().toUpperCase(Locale.ROOT);
        Team team = teamRepository.findByInviteCode(inviteCode)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "유효한 팀 초대 코드가 아닙니다."));

        if (userTeamRepository.existsByUserIdAndTeamId(userId, team.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 참여 중인 팀입니다.");
        }

        UserTeam membership = new UserTeam();
        membership.setUserId(userId);
        membership.setTeamId(team.getId());
        membership.setTeamRole(MEMBER_ROLE);
        userTeamRepository.save(membership);

        return toResponse(team, MEMBER_ROLE);
    }

    @Override
    public List<TeamMemberResponse> getTeamMembers(String authorizationHeader, Long teamId) {
        Long requesterId = extractUserId(authorizationHeader);
        ensureActiveUser(requesterId);

        if (teamId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "teamId는 필수입니다.");
        }

        if (!userTeamRepository.existsByUserIdAndTeamId(requesterId, teamId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "해당 팀 멤버만 조회할 수 있습니다.");
        }

        List<UserTeam> memberships = userTeamRepository.findByTeamId(teamId);
        if (memberships.isEmpty()) {
            return List.of();
        }

        Map<Long, PortalUser> userById = new HashMap<>();
        List<Long> userIds = memberships.stream().map(UserTeam::getUserId).distinct().toList();
        for (PortalUser user : portalUserRepository.findAllById(userIds)) {
            userById.put(user.getId(), user);
        }

        List<TeamMemberResponse> result = new ArrayList<>();
        for (UserTeam membership : memberships) {
            PortalUser user = userById.get(membership.getUserId());
            if (user != null) {
                result.add(new TeamMemberResponse(
                        user.getId(),
                        user.getName(),
                        user.getEmail(),
                        membership.getTeamRole()
                ));
            }
        }
        return result;
    }

    @Override
    @Transactional
    public void updateTeamMemberRole(String authorizationHeader, Long teamId, Long userId, TeamMemberRoleUpdateRequest request) {
        Long requesterId = extractUserId(authorizationHeader);
        ensureActiveUser(requesterId);
        validateTeamAndUser(teamId, userId);

        UserTeam requesterMembership = ensureManagerMembership(requesterId, teamId);
        UserTeam targetMembership = userTeamRepository.findByUserIdAndTeamId(userId, teamId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "팀 멤버를 찾을 수 없습니다."));

        String normalizedRole = normalizeTeamRole(request == null ? null : request.teamRole());

        if (OWNER_ROLE.equals(targetMembership.getTeamRole()) && !OWNER_ROLE.equals(requesterMembership.getTeamRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "OWNER 권한 변경은 OWNER만 가능합니다.");
        }
        if (OWNER_ROLE.equals(normalizedRole) && !OWNER_ROLE.equals(requesterMembership.getTeamRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "OWNER 권한 부여는 OWNER만 가능합니다.");
        }

        targetMembership.setTeamRole(normalizedRole);
    }

    @Override
    @Transactional
    public void removeTeamMember(String authorizationHeader, Long teamId, Long userId) {
        Long requesterId = extractUserId(authorizationHeader);
        ensureActiveUser(requesterId);
        validateTeamAndUser(teamId, userId);

        if (requesterId.equals(userId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "자기 자신 제거는 지원하지 않습니다.");
        }

        UserTeam requesterMembership = ensureManagerMembership(requesterId, teamId);
        UserTeam targetMembership = userTeamRepository.findByUserIdAndTeamId(userId, teamId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "팀 멤버를 찾을 수 없습니다."));

        if (OWNER_ROLE.equals(targetMembership.getTeamRole()) && !OWNER_ROLE.equals(requesterMembership.getTeamRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "OWNER 멤버 제거는 OWNER만 가능합니다.");
        }

        userTeamRepository.deleteByUserIdAndTeamId(userId, teamId);
    }

    private TeamResponse toResponse(Team team, String teamRole) {
        return new TeamResponse(
                team.getId(),
                team.getName(),
                team.getDescription(),
                teamRole,
                team.getInviteCode()
        );
    }

    private UserTeam ensureManagerMembership(Long userId, Long teamId) {
        UserTeam membership = userTeamRepository.findByUserIdAndTeamId(userId, teamId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "해당 팀 멤버만 요청할 수 있습니다."));

        if (!isManagerRole(membership.getTeamRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "팀 관리자 권한이 필요합니다.");
        }
        return membership;
    }

    private void validateTeamAndUser(Long teamId, Long userId) {
        if (teamId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "teamId는 필수입니다.");
        }
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "userId는 필수입니다.");
        }
    }

    private String normalizeTeamRole(String rawRole) {
        if (isBlank(rawRole)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "팀 역할은 필수입니다.");
        }
        String role = rawRole.trim().toUpperCase(Locale.ROOT);
        return switch (role) {
            case OWNER_ROLE, ADMIN_ROLE, MEMBER_ROLE -> role;
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "유효하지 않은 팀 역할입니다.");
        };
    }

    private boolean isManagerRole(String teamRole) {
        return OWNER_ROLE.equals(teamRole) || ADMIN_ROLE.equals(teamRole);
    }

    private PortalUser ensureActiveUser(Long userId) {
        PortalUser user = portalUserRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "유효하지 않은 사용자입니다."));

        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "비활성 사용자입니다.");
        }
        return user;
    }

    private Long extractUserId(String authorizationHeader) {
        if (isBlank(authorizationHeader)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authorization 헤더가 필요합니다.");
        }

        String[] split = authorizationHeader.trim().split("\\s+", 2);
        if (split.length != 2 || !"Bearer".equalsIgnoreCase(split[0]) || isBlank(split[1])) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Bearer 토큰 형식이 올바르지 않습니다.");
        }

        return jwtTokenProvider.extractUserId(split[1].trim());
    }

    private String generateInviteCode() {
        final String alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

        for (int attempt = 0; attempt < 20; attempt++) {
            StringBuilder builder = new StringBuilder(8);
            for (int i = 0; i < 8; i++) {
                int index = ThreadLocalRandom.current().nextInt(alphabet.length());
                builder.append(alphabet.charAt(index));
            }
            String code = builder.toString();
            if (!teamRepository.existsByInviteCode(code)) {
                return code;
            }
        }

        return UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase(Locale.ROOT);
    }

    private String normalizeDescription(String description) {
        if (description == null) {
            return null;
        }
        String trimmed = description.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
