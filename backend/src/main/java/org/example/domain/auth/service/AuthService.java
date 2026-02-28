package org.example.domain.auth.service;

import org.example.domain.auth.dto.AuthLoginResult;
import org.example.domain.auth.dto.AuthRefreshResult;
import org.example.domain.auth.dto.LoginRequest;
import org.example.domain.auth.dto.LoginResponse;
import org.example.domain.auth.dto.SignupRequest;
import org.example.domain.auth.dto.SignupResponse;

public interface AuthService {
    SignupResponse signup(SignupRequest request);

    AuthLoginResult login(LoginRequest request);

    LoginResponse me(String authorizationHeader);

    AuthRefreshResult refresh(String refreshToken);

    void logout(String refreshToken);
}
