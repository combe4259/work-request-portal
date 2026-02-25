package org.example.domain.user.service;

import org.example.domain.user.dto.UserPasswordUpdateRequest;
import org.example.domain.user.dto.UserPreferencesResponse;
import org.example.domain.user.dto.UserPreferencesUpdateRequest;
import org.example.domain.user.dto.UserProfileResponse;
import org.example.domain.user.dto.UserProfileUpdateRequest;

public interface UserSettingsService {

    UserProfileResponse getMyProfile(String authorizationHeader);

    UserProfileResponse updateMyProfile(String authorizationHeader, UserProfileUpdateRequest request);

    void changeMyPassword(String authorizationHeader, UserPasswordUpdateRequest request);

    UserPreferencesResponse getMyPreferences(String authorizationHeader);

    UserPreferencesResponse updateMyPreferences(String authorizationHeader, UserPreferencesUpdateRequest request);
}
