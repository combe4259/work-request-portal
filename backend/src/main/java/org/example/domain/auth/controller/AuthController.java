package org.example.domain.auth.controller;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.example.domain.auth.dto.AuthLoginResult;
import org.example.domain.auth.dto.AuthRefreshResult;
import org.example.domain.auth.dto.LoginRequest;
import org.example.domain.auth.dto.LoginResponse;
import org.example.domain.auth.dto.SignupRequest;
import org.example.domain.auth.dto.SignupResponse;
import org.example.domain.auth.dto.TokenRefreshResponse;
import org.example.domain.auth.service.AuthService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final String refreshCookieName;
    private final long refreshTokenExpireSeconds;
    private final boolean refreshCookieSecure;
    private final String refreshCookieSameSite;

    public AuthController(
            AuthService authService,
            @Value("${app.jwt.refresh-cookie-name:refresh_token}") String refreshCookieName,
            @Value("${app.jwt.refresh-token-expire-seconds:1209600}") long refreshTokenExpireSeconds,
            @Value("${app.jwt.refresh-cookie-secure:false}") boolean refreshCookieSecure,
            @Value("${app.jwt.refresh-cookie-same-site:Lax}") String refreshCookieSameSite
    ) {
        this.authService = authService;
        this.refreshCookieName = refreshCookieName;
        this.refreshTokenExpireSeconds = refreshTokenExpireSeconds;
        this.refreshCookieSecure = refreshCookieSecure;
        this.refreshCookieSameSite = refreshCookieSameSite;
    }

    @PostMapping("/signup")
    public ResponseEntity<SignupResponse> signup(@Valid @RequestBody SignupRequest request) {
        return ResponseEntity.ok(authService.signup(request));
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthLoginResult loginResult = authService.login(request);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, buildRefreshCookie(loginResult.refreshToken()).toString())
                .body(loginResult.response());
    }

    @GetMapping("/me")
    public ResponseEntity<LoginResponse> me(
            @RequestHeader(name = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader
    ) {
        return ResponseEntity.ok(authService.me(authorizationHeader));
    }

    @PostMapping("/refresh")
    public ResponseEntity<TokenRefreshResponse> refresh(HttpServletRequest request) {
        String refreshToken = extractRefreshToken(request);
        AuthRefreshResult refreshResult = authService.refresh(refreshToken);

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, buildRefreshCookie(refreshResult.refreshToken()).toString())
                .body(new TokenRefreshResponse(refreshResult.accessToken()));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request) {
        authService.logout(extractRefreshToken(request));
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, buildExpiredRefreshCookie().toString())
                .build();
    }

    private String extractRefreshToken(HttpServletRequest request) {
        if (request.getCookies() == null) {
            return null;
        }

        for (Cookie cookie : request.getCookies()) {
            if (refreshCookieName.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }

    private ResponseCookie buildRefreshCookie(String refreshToken) {
        return ResponseCookie.from(refreshCookieName, refreshToken)
                .httpOnly(true)
                .secure(refreshCookieSecure)
                .sameSite(refreshCookieSameSite)
                .path("/")
                .maxAge(Duration.ofSeconds(refreshTokenExpireSeconds))
                .build();
    }

    private ResponseCookie buildExpiredRefreshCookie() {
        return ResponseCookie.from(refreshCookieName, "")
                .httpOnly(true)
                .secure(refreshCookieSecure)
                .sameSite(refreshCookieSameSite)
                .path("/")
                .maxAge(Duration.ZERO)
                .build();
    }
}
