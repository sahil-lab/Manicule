package local.manicule;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class PreflightController {
  @PostMapping(
      path = "/api/preflight",
      consumes = MediaType.APPLICATION_JSON_VALUE,
      produces = MediaType.APPLICATION_JSON_VALUE)
  public PreflightResponse validate(@Valid @RequestBody PreflightRequest request) {
    return new PreflightResponse(true, false, request.name().strip(), request.version());
  }

  public record PreflightRequest(
      @NotBlank(message = "Name is required.")
          @Size(max = 80, message = "Name must be at most 80 characters.")
          String name,
      @NotBlank(message = "Version is required.")
          @Pattern(
              regexp = "[A-Za-z0-9][A-Za-z0-9._+\\-]{0,39}",
              message =
                  "Use 1-40 letters, digits, dots, underscores, plus signs or hyphens; start with a letter or digit.")
          String version) {}

  public record PreflightResponse(boolean valid, boolean persisted, String name, String version) {}
}
