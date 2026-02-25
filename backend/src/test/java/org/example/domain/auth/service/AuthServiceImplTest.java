package org.example.domain.auth.service;

import org.example.domain.auth.dto.LoginRequest;
import org.example.domain.auth.dto.LoginResponse;
import org.example.domain.auth.dto.SignupRequest;
import org.example.domain.auth.dto.SignupResponse;
import org.example.domain.team.repository.TeamRepository;
import org.example.domain.team.repository.UserTeamRepository;
import org.example.domain.user.entity.PortalUser;
import org.example.domain.user.repository.PortalUserRepository;
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

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceImplTest {

    @Mock
    private PortalUserRepository portalUserRepository;

    @Mock
    private TeamRepository teamRepository;

    @Mock
    private UserTeamRepository userTeamRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @InjectMocks
    private AuthServiceImpl authService;

    @Test
    @DisplayName("signup 성공 시 사용자만 생성한다")
    void signupSuccess() {
        SignupRequest request = new SignupRequest("홍길동", "Test@Example.com", null, "password123");

        when(portalUserRepository.existsByEmail("test@example.com")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("encoded-password");
        when(portalUserRepository.save(any(PortalUser.class))).thenAnswer(invocation -> {
            PortalUser user = invocation.getArgument(0);
            user.setId(10L);
            return user;
        });

        SignupResponse response = authService.signup(request);

        assertEquals(10L, response.id());
        assertEquals("test@example.com", response.email());
        verify(teamRepository, never()).save(any());
        verify(userTeamRepository, never()).save(any());
    }

    @Test
    @DisplayName("signup 중복 이메일이면 409를 반환한다")
    void signupDuplicateEmail() {
        SignupRequest request = new SignupRequest("홍길동", "test@example.com", "DEVELOPER", "password123");
        when(portalUserRepository.existsByEmail("test@example.com")).thenReturn(true);

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> authService.signup(request));

        assertEquals(HttpStatus.CONFLICT, exception.getStatusCode());
    }

    @Test
    @DisplayName("login 성공 시 JWT를 포함한 응답을 반환한다")
    void loginSuccess() {
        PortalUser user = activeUser(1L, "test@example.com");
        user.setPasswordHash("encoded-password");

        when(portalUserRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("password123", "encoded-password")).thenReturn(true);
        when(portalUserRepository.save(any(PortalUser.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(userTeamRepository.findByUserId(1L)).thenReturn(List.of());
        when(jwtTokenProvider.createAccessToken(1L, "test@example.com", "DEVELOPER")).thenReturn("jwt-token");

        LoginResponse response = authService.login(new LoginRequest("Test@Example.com", "password123"));

        assertEquals("jwt-token", response.accessToken());
        assertEquals(1L, response.user().id());
        assertNotNull(user.getLastLoginAt());
    }

    @Test
    @DisplayName("login 비밀번호 불일치면 401을 반환한다")
    void loginWrongPassword() {
        PortalUser user = activeUser(1L, "test@example.com");
        user.setPasswordHash("encoded-password");

        when(portalUserRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong-password", "encoded-password")).thenReturn(false);

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> authService.login(new LoginRequest("test@example.com", "wrong-password"))
        );

        assertEquals(HttpStatus.UNAUTHORIZED, exception.getStatusCode());
        verify(jwtTokenProvider, never()).createAccessToken(any(), anyString(), anyString());
    }

    @Test
    @DisplayName("me는 Bearer 토큰으로 사용자 정보를 조회한다")
    void meSuccess() {
        PortalUser user = activeUser(3L, "me@example.com");

        when(jwtTokenProvider.extractUserId("token-value")).thenReturn(3L);
        when(portalUserRepository.findById(3L)).thenReturn(Optional.of(user));
        when(userTeamRepository.findByUserId(3L)).thenReturn(List.of());

        LoginResponse response = authService.me("Bearer token-value");

        assertEquals("token-value", response.accessToken());
        assertEquals(3L, response.user().id());
    }

    @Test
    @DisplayName("me Authorization 헤더 형식이 잘못되면 401을 반환한다")
    void meInvalidAuthorizationHeader() {
        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> authService.me("invalid-header")
        );

        assertEquals(HttpStatus.UNAUTHORIZED, exception.getStatusCode());
        verify(jwtTokenProvider, never()).extractUserId(anyString());
    }

    private PortalUser activeUser(Long id, String email) {
        PortalUser user = new PortalUser();
        user.setId(id);
        user.setName("테스트유저");
        user.setEmail(email);
        user.setRole("DEVELOPER");
        user.setIsActive(true);
        return user;
    }
}
