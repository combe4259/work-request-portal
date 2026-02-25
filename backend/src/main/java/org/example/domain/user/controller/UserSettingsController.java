package org.example.domain.user.controller;

import jakarta.validation.Valid;
import org.example.domain.user.dto.UserPasswordUpdateRequest;
import org.example.domain.user.dto.UserPreferencesResponse;
import org.example.domain.user.dto.UserPreferencesUpdateRequest;
import org.example.domain.user.dto.UserProfileResponse;
import org.example.domain.user.dto.UserProfileUpdateRequest;
import org.example.domain.user.service.UserSettingsService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users/me")
public class UserSettingsController {

    private final UserSettingsService userSettingsService;

    public UserSettingsController(UserSettingsService userSettingsService) {
        this.userSettingsService = userSettingsService;
    }

    @GetMapping("/profile")
    public ResponseEntity<UserProfileResponse> getMyProfile(
            @RequestHeader(name = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader
    ) {
        return ResponseEntity.ok(userSettingsService.getMyProfile(authorizationHeader));
    }

    @PatchMapping("/profile")
    public ResponseEntity<UserProfileResponse> updateMyProfile(
            @RequestHeader(name = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
            @Valid @RequestBody UserProfileUpdateRequest request
    ) {
        return ResponseEntity.ok(userSettingsService.updateMyProfile(authorizationHeader, request));
    }

    @PatchMapping("/password")
    public ResponseEntity<Void> changeMyPassword(
            @RequestHeader(name = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
            @Valid @RequestBody UserPasswordUpdateRequest request
    ) {
        userSettingsService.changeMyPassword(authorizationHeader, request);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/preferences")
    public ResponseEntity<UserPreferencesResponse> getMyPreferences(
            @RequestHeader(name = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader
    ) {
        return ResponseEntity.ok(userSettingsService.getMyPreferences(authorizationHeader));
    }

    @PatchMapping("/preferences")
    public ResponseEntity<UserPreferencesResponse> updateMyPreferences(
            @RequestHeader(name = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
            @Valid @RequestBody UserPreferencesUpdateRequest request
    ) {
        return ResponseEntity.ok(userSettingsService.updateMyPreferences(authorizationHeader, request));
    }
}
