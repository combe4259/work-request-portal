package org.example.domain.user.service;

import org.example.domain.user.dto.UserPasswordUpdateRequest;
import org.example.domain.user.dto.UserPreferencesResponse;
import org.example.domain.user.dto.UserPreferencesUpdateRequest;
import org.example.domain.user.dto.UserProfileResponse;
import org.example.domain.user.dto.UserProfileUpdateRequest;
import org.example.domain.user.entity.PortalUser;
import org.example.domain.user.entity.UserPreference;
import org.example.domain.user.repository.PortalUserRepository;
import org.example.domain.user.repository.UserPreferenceRepository;
import org.example.global.security.JwtTokenProvider;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

@Service
@Transactional(readOnly = true)
public class UserSettingsServiceImpl implements UserSettingsService {

    private static final Set<String> ALLOWED_DISPLAY_ROLES = Set.of("PM", "CTO", "개발자", "디자이너", "QA", "기획자");
    private static final Set<String> ALLOWED_AVATAR_COLORS = Set.of("brand", "indigo", "violet", "emerald", "amber", "rose", "slate");
    private static final Set<String> ALLOWED_LANDING_PAGES = Set.of("/dashboard", "/work-requests", "/tech-tasks");
    private static final Set<Integer> ALLOWED_ROW_COUNTS = Set.of(10, 20, 50);
    private static final String DEFAULT_DISPLAY_ROLE = "개발자";
    private static final String DEFAULT_AVATAR_COLOR = "brand";
    private static final String DEFAULT_LANDING_PAGE = "/dashboard";
    private static final int DEFAULT_ROW_COUNT = 20;
    private static final int MAX_PHOTO_URL_LENGTH = 8_000_000;
    private static final Pattern STRONG_PASSWORD_PATTERN = Pattern.compile("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,72}$");

    private final PortalUserRepository portalUserRepository;
    private final UserPreferenceRepository userPreferenceRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    public UserSettingsServiceImpl(
            PortalUserRepository portalUserRepository,
            UserPreferenceRepository userPreferenceRepository,
            PasswordEncoder passwordEncoder,
            JwtTokenProvider jwtTokenProvider
    ) {
        this.portalUserRepository = portalUserRepository;
        this.userPreferenceRepository = userPreferenceRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
    }

    @Override
    public UserProfileResponse getMyProfile(String authorizationHeader) {
        PortalUser user = resolveActiveUser(authorizationHeader);
        UserPreference preference = getOrCreatePreference(user.getId());
        return toProfileResponse(user, preference);
    }

    @Override
    @Transactional
    public UserProfileResponse updateMyProfile(String authorizationHeader, UserProfileUpdateRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "프로필 요청 본문이 비어 있습니다.");
        }

        PortalUser user = resolveActiveUser(authorizationHeader);
        String normalizedEmail = normalizeEmail(request.email());

        if (portalUserRepository.existsByEmailAndIdNot(normalizedEmail, user.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 사용 중인 이메일입니다.");
        }

        user.setName(request.name().trim());
        user.setEmail(normalizedEmail);
        user.setPosition(normalizeDisplayRole(request.role()));
        portalUserRepository.save(user);

        UserPreference preference = getOrCreatePreference(user.getId());
        preference.setAvatarColor(normalizeAvatarColor(request.avatarColor()));
        preference.setPhotoUrl(normalizePhotoUrl(request.photoUrl()));
        userPreferenceRepository.save(preference);

        return toProfileResponse(user, preference);
    }

    @Override
    @Transactional
    public void changeMyPassword(String authorizationHeader, UserPasswordUpdateRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "비밀번호 변경 요청 본문이 비어 있습니다.");
        }

        PortalUser user = resolveActiveUser(authorizationHeader);
        String currentPassword = trimToNull(request.currentPassword());
        String newPassword = trimToNull(request.newPassword());

        if (currentPassword == null || newPassword == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "현재 비밀번호와 새 비밀번호를 입력해주세요.");
        }

        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "현재 비밀번호가 올바르지 않습니다.");
        }

        if (passwordEncoder.matches(newPassword, user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "새 비밀번호가 현재 비밀번호와 같습니다.");
        }

        if (!STRONG_PASSWORD_PATTERN.matcher(newPassword).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "새 비밀번호는 영문 대소문자와 숫자를 포함해 8자 이상이어야 합니다.");
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        portalUserRepository.save(user);
    }

    @Override
    public UserPreferencesResponse getMyPreferences(String authorizationHeader) {
        PortalUser user = resolveActiveUser(authorizationHeader);
        UserPreference preference = getOrCreatePreference(user.getId());
        return toPreferencesResponse(preference);
    }

    @Override
    @Transactional
    public UserPreferencesResponse updateMyPreferences(String authorizationHeader, UserPreferencesUpdateRequest request) {
        if (request == null || request.notification() == null || request.display() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "환경설정 요청 본문이 올바르지 않습니다.");
        }

        PortalUser user = resolveActiveUser(authorizationHeader);
        UserPreference preference = getOrCreatePreference(user.getId());

        preference.setNotifyAssign(request.notification().assign());
        preference.setNotifyComment(request.notification().comment());
        preference.setNotifyDeadline(request.notification().deadline());
        preference.setNotifyStatus(request.notification().status());
        preference.setNotifyDeploy(request.notification().deploy());
        preference.setNotifyMention(request.notification().mention());
        preference.setLandingPage(normalizeLandingPage(request.display().landing()));
        preference.setRowCount(normalizeRowCount(request.display().rowCount()));

        UserPreference savedPreference = userPreferenceRepository.save(preference);
        return toPreferencesResponse(savedPreference);
    }

    private UserProfileResponse toProfileResponse(PortalUser user, UserPreference preference) {
        return new UserProfileResponse(
                user.getName(),
                user.getEmail(),
                resolveDisplayRole(user),
                coalesce(preference.getAvatarColor(), DEFAULT_AVATAR_COLOR),
                preference.getPhotoUrl()
        );
    }

    private UserPreferencesResponse toPreferencesResponse(UserPreference preference) {
        return new UserPreferencesResponse(
                new UserPreferencesResponse.Notification(
                        Boolean.TRUE.equals(preference.getNotifyAssign()),
                        Boolean.TRUE.equals(preference.getNotifyComment()),
                        Boolean.TRUE.equals(preference.getNotifyDeadline()),
                        Boolean.TRUE.equals(preference.getNotifyStatus()),
                        Boolean.TRUE.equals(preference.getNotifyDeploy()),
                        Boolean.TRUE.equals(preference.getNotifyMention())
                ),
                new UserPreferencesResponse.Display(
                        coalesce(preference.getLandingPage(), DEFAULT_LANDING_PAGE),
                        preference.getRowCount() == null ? DEFAULT_ROW_COUNT : preference.getRowCount()
                )
        );
    }

    private String resolveDisplayRole(PortalUser user) {
        String displayRole = trimToNull(user.getPosition());
        if (displayRole != null) {
            return displayRole;
        }

        String systemRole = trimToNull(user.getRole());
        if (systemRole == null) {
            return DEFAULT_DISPLAY_ROLE;
        }

        return switch (systemRole.toUpperCase(Locale.ROOT)) {
            case "PM" -> "PM";
            case "TEAM_LEAD" -> "CTO";
            case "REQUESTER" -> "기획자";
            case "DEVELOPER" -> "개발자";
            default -> DEFAULT_DISPLAY_ROLE;
        };
    }

    private UserPreference getOrCreatePreference(Long userId) {
        return userPreferenceRepository.findById(userId).orElseGet(() -> {
            UserPreference preference = new UserPreference();
            preference.setUserId(userId);
            preference.setNotifyAssign(true);
            preference.setNotifyComment(true);
            preference.setNotifyDeadline(true);
            preference.setNotifyStatus(false);
            preference.setNotifyDeploy(true);
            preference.setNotifyMention(false);
            preference.setLandingPage(DEFAULT_LANDING_PAGE);
            preference.setRowCount(DEFAULT_ROW_COUNT);
            preference.setAvatarColor(DEFAULT_AVATAR_COLOR);
            preference.setPhotoUrl(null);
            return preference;
        });
    }

    private PortalUser resolveActiveUser(String authorizationHeader) {
        Long userId = extractUserId(authorizationHeader);
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

    private String normalizeEmail(String email) {
        String normalized = trimToNull(email);
        if (normalized == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이메일을 입력해주세요.");
        }
        return normalized.toLowerCase(Locale.ROOT);
    }

    private String normalizeDisplayRole(String displayRole) {
        String normalized = trimToNull(displayRole);
        if (normalized == null || !ALLOWED_DISPLAY_ROLES.contains(normalized)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "유효하지 않은 표시 역할입니다.");
        }
        return normalized;
    }

    private String normalizeAvatarColor(String avatarColor) {
        String normalized = trimToNull(avatarColor);
        if (normalized == null) {
            return DEFAULT_AVATAR_COLOR;
        }
        if (!ALLOWED_AVATAR_COLORS.contains(normalized)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "유효하지 않은 아바타 색상입니다.");
        }
        return normalized;
    }

    private String normalizePhotoUrl(String photoUrl) {
        String normalized = trimToNull(photoUrl);
        if (normalized == null) {
            return null;
        }

        if (normalized.length() > MAX_PHOTO_URL_LENGTH) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "프로필 사진 데이터가 너무 큽니다.");
        }

        if (!normalized.startsWith("data:image/")
                && !normalized.startsWith("http://")
                && !normalized.startsWith("https://")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "지원하지 않는 프로필 사진 형식입니다.");
        }

        return normalized;
    }

    private String normalizeLandingPage(String landingPage) {
        String normalized = trimToNull(landingPage);
        if (normalized == null || !ALLOWED_LANDING_PAGES.contains(normalized)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "지원하지 않는 기본 랜딩 페이지입니다.");
        }
        return normalized;
    }

    private int normalizeRowCount(Integer rowCount) {
        if (rowCount == null || !ALLOWED_ROW_COUNTS.contains(rowCount)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "지원하지 않는 기본 표시 건수입니다.");
        }
        return rowCount;
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String coalesce(String value, String defaultValue) {
        return isBlank(value) ? defaultValue : value;
    }
}
