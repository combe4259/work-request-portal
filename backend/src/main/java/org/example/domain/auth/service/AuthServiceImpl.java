package org.example.domain.auth.service;

import org.example.domain.auth.dto.AuthTeamResponse;
import org.example.domain.auth.dto.AuthUserResponse;
import org.example.domain.auth.dto.LoginRequest;
import org.example.domain.auth.dto.LoginResponse;
import org.example.domain.auth.dto.SignupRequest;
import org.example.domain.auth.dto.SignupResponse;
import org.example.domain.team.entity.Team;
import org.example.domain.team.entity.UserTeam;
import org.example.domain.team.repository.TeamRepository;
import org.example.domain.team.repository.UserTeamRepository;
import org.example.domain.user.entity.PortalUser;
import org.example.domain.user.repository.PortalUserRepository;
import org.example.global.security.JwtTokenProvider;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@Transactional(readOnly = true)
public class AuthServiceImpl implements AuthService {

    private static final String DEFAULT_ROLE = "DEVELOPER";

    private final PortalUserRepository portalUserRepository;
    private final TeamRepository teamRepository;
    private final UserTeamRepository userTeamRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    public AuthServiceImpl(
            PortalUserRepository portalUserRepository,
            TeamRepository teamRepository,
            UserTeamRepository userTeamRepository,
            PasswordEncoder passwordEncoder,
            JwtTokenProvider jwtTokenProvider
    ) {
        this.portalUserRepository = portalUserRepository;
        this.teamRepository = teamRepository;
        this.userTeamRepository = userTeamRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
    }

    @Override
    @Transactional
    public SignupResponse signup(SignupRequest request) {
        validateSignupRequest(request);
        String normalizedEmail = request.email().trim().toLowerCase(Locale.ROOT);

        if (portalUserRepository.existsByEmail(normalizedEmail)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 사용 중인 이메일입니다.");
        }

        PortalUser user = new PortalUser();
        user.setName(request.name().trim());
        user.setEmail(normalizedEmail);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole(normalizeRole(request.role()));
        user.setIsActive(true);

        PortalUser savedUser = portalUserRepository.save(user);

        return new SignupResponse(savedUser.getId(), savedUser.getEmail());
    }

    @Override
    @Transactional
    public LoginResponse login(LoginRequest request) {
        if (request == null || isBlank(request.email()) || isBlank(request.password())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이메일과 비밀번호를 입력해주세요.");
        }

        PortalUser user = portalUserRepository.findByEmail(request.email().trim().toLowerCase(Locale.ROOT))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "이메일 또는 비밀번호가 올바르지 않습니다."));

        validateActiveUser(user);

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "이메일 또는 비밀번호가 올바르지 않습니다.");
        }

        user.setLastLoginAt(LocalDateTime.now());
        portalUserRepository.save(user);

        String accessToken = jwtTokenProvider.createAccessToken(user.getId(), user.getEmail(), user.getRole());
        return toLoginResponse(user, accessToken);
    }

    @Override
    public LoginResponse me(String authorizationHeader) {
        String accessToken = extractBearerToken(authorizationHeader);
        Long userId = jwtTokenProvider.extractUserId(accessToken);

        PortalUser user = portalUserRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "유효하지 않은 토큰입니다."));

        validateActiveUser(user);
        return toLoginResponse(user, accessToken);
    }

    private LoginResponse toLoginResponse(PortalUser user, String accessToken) {
        AuthUserResponse userResponse = new AuthUserResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getRole(),
                user.getSlackUserId()
        );

        List<AuthTeamResponse> teams = loadTeams(user.getId());
        return new LoginResponse(accessToken, userResponse, teams);
    }

    private List<AuthTeamResponse> loadTeams(Long userId) {
        List<UserTeam> memberships = userTeamRepository.findByUserId(userId);
        if (memberships.isEmpty()) {
            return List.of();
        }

        Map<Long, Team> teamById = new HashMap<>();
        for (Team team : teamRepository.findAllById(memberships.stream().map(UserTeam::getTeamId).distinct().toList())) {
            teamById.put(team.getId(), team);
        }

        List<AuthTeamResponse> result = new ArrayList<>();
        for (UserTeam membership : memberships) {
            Team team = teamById.get(membership.getTeamId());
            if (team != null) {
                result.add(new AuthTeamResponse(
                        team.getId(),
                        team.getName(),
                        team.getDescription(),
                        membership.getTeamRole(),
                        team.getInviteCode()
                ));
            }
        }
        return result;
    }

    private void validateSignupRequest(SignupRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "요청 본문이 비어 있습니다.");
        }
        if (isBlank(request.name())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이름을 입력해주세요.");
        }
        if (isBlank(request.email())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이메일을 입력해주세요.");
        }
        if (isBlank(request.password())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "비밀번호를 입력해주세요.");
        }
        if (request.password().length() < 8 || request.password().length() > 72) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "비밀번호는 8자 이상 72자 이하여야 합니다.");
        }
    }

    private void validateActiveUser(PortalUser user) {
        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "비활성 사용자입니다.");
        }
    }

    private String extractBearerToken(String authorizationHeader) {
        if (isBlank(authorizationHeader)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authorization 헤더가 필요합니다.");
        }

        String[] split = authorizationHeader.trim().split("\\s+", 2);
        if (split.length != 2 || !"Bearer".equalsIgnoreCase(split[0]) || isBlank(split[1])) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Bearer 토큰 형식이 올바르지 않습니다.");
        }

        return split[1].trim();
    }

    private String normalizeRole(String rawRole) {
        if (isBlank(rawRole)) {
            return DEFAULT_ROLE;
        }

        String role = rawRole.trim().toUpperCase(Locale.ROOT);
        return switch (role) {
            case "PM", "TEAM_LEAD", "DEVELOPER", "REQUESTER" -> role;
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "유효하지 않은 역할입니다.");
        };
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
