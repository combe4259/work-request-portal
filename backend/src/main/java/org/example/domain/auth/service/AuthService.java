package org.example.domain.auth.service;

import org.example.domain.auth.dto.LoginRequest;
import org.example.domain.auth.dto.LoginResponse;
import org.example.domain.auth.dto.SignupRequest;
import org.example.domain.auth.dto.SignupResponse;

public interface AuthService {
    SignupResponse signup(SignupRequest request);

    LoginResponse login(LoginRequest request);

    LoginResponse me(String authorizationHeader);
}
