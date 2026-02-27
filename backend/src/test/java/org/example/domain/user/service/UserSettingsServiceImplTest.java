package org.example.domain.user.service;

import org.example.domain.user.dto.UserPasswordUpdateRequest;
import org.example.domain.user.dto.UserPreferencesUpdateRequest;
import org.example.domain.user.dto.UserProfileResponse;
import org.example.domain.user.dto.UserProfileUpdateRequest;
import org.example.domain.user.entity.PortalUser;
import org.example.domain.user.entity.UserPreference;
import org.example.domain.user.repository.PortalUserRepository;
import org.example.domain.user.repository.UserPreferenceRepository;
import org.example.global.security.JwtTokenProvider;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserSettingsServiceImplTest {

    private static final String AUTHORIZATION_HEADER = "Bearer token-value";

    @Mock
    private PortalUserRepository portalUserRepository;

    @Mock
    private UserPreferenceRepository userPreferenceRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @InjectMocks
    private UserSettingsServiceImpl userSettingsService;

    @Test
    @DisplayName("내 프로필 조회 시 설정이 없으면 기본값으로 응답한다")
    void getMyProfileReturnsDefaultsWhenPreferenceMissing() {
        PortalUser user = activeUser(1L, "tester@example.com");

        when(jwtTokenProvider.extractUserId("token-value")).thenReturn(1L);
        when(portalUserRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userPreferenceRepository.findById(1L)).thenReturn(Optional.empty());

        UserProfileResponse response = userSettingsService.getMyProfile(AUTHORIZATION_HEADER);

        assertEquals("테스터", response.name());
        assertEquals("tester@example.com", response.email());
        assertEquals("개발자", response.role());
        assertEquals("brand", response.avatarColor());
    }

    @Test
    @DisplayName("프로필 수정 시 중복 이메일이면 409를 반환한다")
    void updateMyProfileConflictWhenEmailDuplicated() {
        PortalUser user = activeUser(1L, "tester@example.com");
        UserProfileUpdateRequest request = new UserProfileUpdateRequest("새이름", "dup@example.com", "PM", "brand", null, null);

        when(jwtTokenProvider.extractUserId("token-value")).thenReturn(1L);
        when(portalUserRepository.findById(1L)).thenReturn(Optional.of(user));
        when(portalUserRepository.existsByEmailAndIdNot("dup@example.com", 1L)).thenReturn(true);

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> userSettingsService.updateMyProfile(AUTHORIZATION_HEADER, request)
        );

        assertEquals(HttpStatus.CONFLICT, exception.getStatusCode());
    }

    @Test
    @DisplayName("비밀번호 변경 시 현재 비밀번호가 다르면 400을 반환한다")
    void changeMyPasswordFailsWhenCurrentPasswordMismatched() {
        PortalUser user = activeUser(1L, "tester@example.com");
        user.setPasswordHash("encoded-old");

        when(jwtTokenProvider.extractUserId("token-value")).thenReturn(1L);
        when(portalUserRepository.findById(1L)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong-password", "encoded-old")).thenReturn(false);

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> userSettingsService.changeMyPassword(
                        AUTHORIZATION_HEADER,
                        new UserPasswordUpdateRequest("wrong-password", "NewPassword1")
                )
        );

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        verify(passwordEncoder, never()).encode(anyString());
    }

    @Test
    @DisplayName("환경설정 저장 시 허용되지 않은 랜딩 페이지면 400을 반환한다")
    void updateMyPreferencesFailsWhenLandingPageInvalid() {
        PortalUser user = activeUser(1L, "tester@example.com");
        UserPreference preference = new UserPreference();
        preference.setUserId(1L);

        UserPreferencesUpdateRequest request = new UserPreferencesUpdateRequest(
                new UserPreferencesUpdateRequest.Notification(true, true, true, false, true, false),
                new UserPreferencesUpdateRequest.Display("/invalid", 20)
        );

        when(jwtTokenProvider.extractUserId("token-value")).thenReturn(1L);
        when(portalUserRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userPreferenceRepository.findById(1L)).thenReturn(Optional.of(preference));

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> userSettingsService.updateMyPreferences(AUTHORIZATION_HEADER, request)
        );

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        verify(userPreferenceRepository, never()).save(preference);
    }

    private PortalUser activeUser(Long id, String email) {
        PortalUser user = new PortalUser();
        user.setId(id);
        user.setName("테스터");
        user.setEmail(email);
        user.setRole("DEVELOPER");
        user.setIsActive(true);
        return user;
    }
}
