package org.example.domain.auth.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.domain.auth.dto.AuthTeamResponse;
import org.example.domain.auth.dto.AuthUserResponse;
import org.example.domain.auth.dto.LoginRequest;
import org.example.domain.auth.dto.LoginResponse;
import org.example.domain.auth.dto.SignupRequest;
import org.example.domain.auth.dto.SignupResponse;
import org.example.domain.auth.service.AuthService;
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

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthController.class)
class AuthControllerTest {

    private static final String AUTH_HEADER = "Bearer token";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AuthService authService;

    @Test
    @DisplayName("회원가입 성공")
    void signupSuccess() throws Exception {
        SignupRequest request = new SignupRequest("홍길동", "hong@example.com", "DEVELOPER", "password123");
        SignupResponse response = new SignupResponse(1L, "hong@example.com");
        when(authService.signup(eq(request))).thenReturn(response);

        mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1L))
                .andExpect(jsonPath("$.email").value("hong@example.com"));

        verify(authService).signup(eq(request));
    }

    @Test
    @DisplayName("회원가입 요청 검증 실패 시 400을 반환한다")
    void signupValidationFail() throws Exception {
        SignupRequest invalidRequest = new SignupRequest("", "invalid-email", "DEVELOPER", "1234");

        mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(authService);
    }

    @Test
    @DisplayName("로그인 성공")
    void loginSuccess() throws Exception {
        LoginRequest request = new LoginRequest("hong@example.com", "password123");
        LoginResponse response = new LoginResponse(
                "access-token",
                new AuthUserResponse(1L, "홍길동", "hong@example.com", "DEVELOPER", "U12345"),
                List.of(new AuthTeamResponse(10L, "개발팀", "업무 포털", "OWNER"))
        );
        when(authService.login(eq(request))).thenReturn(response);

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("access-token"))
                .andExpect(jsonPath("$.user.id").value(1L))
                .andExpect(jsonPath("$.teams[0].id").value(10L));

        verify(authService).login(eq(request));
    }

    @Test
    @DisplayName("로그인 요청 검증 실패 시 400을 반환한다")
    void loginValidationFail() throws Exception {
        LoginRequest invalidRequest = new LoginRequest("wrong-email", "123");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(authService);
    }

    @Test
    @DisplayName("내 정보 조회 성공")
    void meSuccess() throws Exception {
        LoginResponse response = new LoginResponse(
                "access-token",
                new AuthUserResponse(1L, "홍길동", "hong@example.com", "DEVELOPER", "U12345"),
                List.of()
        );
        when(authService.me(AUTH_HEADER)).thenReturn(response);

        mockMvc.perform(get("/api/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, AUTH_HEADER))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.email").value("hong@example.com"));

        verify(authService).me(AUTH_HEADER);
    }

    @Test
    @DisplayName("내 정보 조회 시 서비스 401 예외가 전파된다")
    void meUnauthorized() throws Exception {
        when(authService.me(null))
                .thenThrow(new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authorization 헤더가 필요합니다."));

        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized());

        verify(authService).me(null);
    }

    @Test
    @DisplayName("로그아웃은 204를 반환한다")
    void logoutSuccess() throws Exception {
        mockMvc.perform(post("/api/auth/logout"))
                .andExpect(status().isNoContent());

        verifyNoInteractions(authService);
    }
}
