package org.example.global.github;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(GitHubWebhookController.class)
class GitHubWebhookControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private GitHubWebhookSignatureVerifier signatureVerifier;

    @MockBean
    private GitHubWebhookService gitHubWebhookService;

    @Test
    @DisplayName("서명 검증 실패면 401을 반환한다")
    void rejectWhenSignatureInvalid() throws Exception {
        String payload = "{\"action\":\"opened\"}";
        when(signatureVerifier.isValid(payload, "sha256=invalid")).thenReturn(false);

        mockMvc.perform(post("/webhook/github")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-GitHub-Event", "pull_request")
                        .header("X-Hub-Signature-256", "sha256=invalid")
                        .content(payload))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(gitHubWebhookService);
    }

    @Test
    @DisplayName("delivery id 헤더가 없으면 400을 반환한다")
    void rejectWhenDeliveryHeaderMissing() throws Exception {
        String payload = "{\"action\":\"opened\"}";
        when(signatureVerifier.isValid(payload, "sha256=valid")).thenReturn(true);

        mockMvc.perform(post("/webhook/github")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-GitHub-Event", "pull_request")
                        .header("X-Hub-Signature-256", "sha256=valid")
                        .content(payload))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(gitHubWebhookService);
    }

    @Test
    @DisplayName("서명 검증 성공이면 이벤트를 서비스로 전달하고 200을 반환한다")
    void acceptWhenSignatureValid() throws Exception {
        String payload = "{\"action\":\"opened\"}";
        when(signatureVerifier.isValid(payload, "sha256=valid")).thenReturn(true);

        mockMvc.perform(post("/webhook/github")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-GitHub-Delivery", "delivery-1")
                        .header("X-GitHub-Event", "pull_request")
                        .header("X-Hub-Signature-256", "sha256=valid")
                        .content(payload))
                .andExpect(status().isOk());

        verify(gitHubWebhookService).handleEvent("delivery-1", "pull_request", payload);
    }
}
