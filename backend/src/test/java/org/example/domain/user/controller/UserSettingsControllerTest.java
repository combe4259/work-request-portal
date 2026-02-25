package org.example.domain.user.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.domain.user.dto.UserPasswordUpdateRequest;
import org.example.domain.user.dto.UserPreferencesResponse;
import org.example.domain.user.dto.UserProfileResponse;
import org.example.domain.user.service.UserSettingsService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(UserSettingsController.class)
class UserSettingsControllerTest {

    private static final String AUTH_HEADER = "Bearer token";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private UserSettingsService userSettingsService;

    @Test
    @DisplayName("내 프로필 조회 성공")
    void getMyProfileSuccess() throws Exception {
        when(userSettingsService.getMyProfile(AUTH_HEADER))
                .thenReturn(new UserProfileResponse("홍길동", "hong@example.com", "PM", "brand", null));

        mockMvc.perform(get("/api/users/me/profile")
                        .header(HttpHeaders.AUTHORIZATION, AUTH_HEADER))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("홍길동"))
                .andExpect(jsonPath("$.email").value("hong@example.com"))
                .andExpect(jsonPath("$.role").value("PM"));

        verify(userSettingsService).getMyProfile(AUTH_HEADER);
    }

    @Test
    @DisplayName("비밀번호 변경 성공 시 204를 반환한다")
    void changeMyPasswordSuccess() throws Exception {
        UserPasswordUpdateRequest request = new UserPasswordUpdateRequest("OldPassword1", "NewPassword1");

        mockMvc.perform(patch("/api/users/me/password")
                        .header(HttpHeaders.AUTHORIZATION, AUTH_HEADER)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNoContent());

        verify(userSettingsService).changeMyPassword(AUTH_HEADER, request);
    }

    @Test
    @DisplayName("환경설정 요청 검증 실패 시 400을 반환한다")
    void updateMyPreferencesValidationFail() throws Exception {
        Map<String, Object> invalidBody = Map.of(
                "notification", Map.of(
                        "assign", true,
                        "comment", true
                )
        );

        mockMvc.perform(patch("/api/users/me/preferences")
                        .header(HttpHeaders.AUTHORIZATION, AUTH_HEADER)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidBody)))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(userSettingsService);
    }

    @Test
    @DisplayName("내 환경설정 조회 성공")
    void getMyPreferencesSuccess() throws Exception {
        UserPreferencesResponse response = new UserPreferencesResponse(
                new UserPreferencesResponse.Notification(true, true, true, false, true, false),
                new UserPreferencesResponse.Display("/dashboard", 20)
        );
        when(userSettingsService.getMyPreferences(AUTH_HEADER)).thenReturn(response);

        mockMvc.perform(get("/api/users/me/preferences")
                        .header(HttpHeaders.AUTHORIZATION, AUTH_HEADER))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.notification.assign").value(true))
                .andExpect(jsonPath("$.display.rowCount").value(20));

        verify(userSettingsService).getMyPreferences(AUTH_HEADER);
    }
}
