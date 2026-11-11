package local.manicule;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(PreflightController.class)
@Import(JsonConfiguration.class)
class PreflightControllerTest {
  @Autowired private MockMvc mvc;

  @Test
  void validMetadataIsNormalizedAndNeverPersisted() throws Exception {
    mvc.perform(
            post("/api/preflight")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"  Synthetic Pets  \",\"version\":\"v1.0-preview+2\"}"))
        .andExpect(status().isOk())
        .andExpect(header().exists("X-Request-Id"))
        .andExpect(jsonPath("$.valid").value(true))
        .andExpect(jsonPath("$.persisted").value(false))
        .andExpect(jsonPath("$.name").value("Synthetic Pets"));
  }

  @Test
  void blankNameAndInvalidVersionHaveSafeFieldErrors() throws Exception {
    mvc.perform(
            post("/api/preflight")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\" \",\"version\":\"secret-value https://example.invalid\"}"))
        .andExpect(status().isBadRequest())
        .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
        .andExpect(jsonPath("$.errors.name").exists())
        .andExpect(jsonPath("$.errors.version").exists())
        .andExpect(content().string(not(containsString("secret-value"))));
  }

  @Test
  void namesOverTheLimitAreRejected() throws Exception {
    mvc.perform(
            post("/api/preflight")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"" + "x".repeat(81) + "\",\"version\":\"1\"}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.errors.name").exists());
  }

  @Test
  void unknownFieldsAreRejectedWithoutEchoingTheirValue() throws Exception {
    mvc.perform(
            post("/api/preflight")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Pets\",\"version\":\"1\",\"url\":\"private-target\"}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.title").value("Invalid JSON request"))
        .andExpect(content().string(not(containsString("private-target"))));
  }

  @Test
  void malformedAndScalarJsonAreRejected() throws Exception {
    for (String body :
        new String[] {
          "{",
          "null",
          "{\"name\":42,\"version\":\"1\"}",
          "{\"name\":true,\"version\":\"1\"}",
          "{\"name\":1.5,\"version\":\"1\"}",
          "{\"name\":\"Pets\",\"version\":\"1\"}{}"
        }) {
      mvc.perform(post("/api/preflight").contentType(MediaType.APPLICATION_JSON).content(body))
          .andExpect(status().isBadRequest());
    }
  }

  @Test
  void oversizedBodiesAreRejected() throws Exception {
    mvc.perform(
            post("/api/preflight")
                .contentType(MediaType.APPLICATION_JSON)
                .content("x".repeat(RequestSafetyFilter.MAX_BODY_BYTES + 1)))
        .andExpect(status().isPayloadTooLarge())
        .andExpect(jsonPath("$.status").value(413));
  }

  @Test
  void exactFieldAndBodyLimitsAreAccepted() throws Exception {
    String body = "{\"name\":\"" + "n".repeat(80) + "\",\"version\":\"" + "v".repeat(40) + "\"}";
    body += " ".repeat(RequestSafetyFilter.MAX_BODY_BYTES - body.length());
    mvc.perform(post("/api/preflight").contentType(MediaType.APPLICATION_JSON).content(body))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.valid").value(true))
        .andExpect(jsonPath("$.persisted").value(false));
  }

  @Test
  void nonJsonContentIsRejected() throws Exception {
    mvc.perform(
            post("/api/preflight")
                .contentType(MediaType.TEXT_PLAIN)
                .content("{\"name\":\"Pets\",\"version\":\"1\"}"))
        .andExpect(status().isUnsupportedMediaType());
  }
}
