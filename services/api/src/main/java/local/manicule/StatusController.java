package local.manicule;

import org.springframework.dao.IncorrectResultSizeDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class StatusController {
  private final JdbcTemplate jdbc;

  public StatusController(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  @GetMapping("/api/status")
  public StatusResponse status() {
    Integer version =
        jdbc.queryForObject(
            "SELECT schema_version FROM skeleton_metadata WHERE id = 1", Integer.class);
    if (version == null) {
      throw new IncorrectResultSizeDataAccessException(1, 0);
    }
    return new StatusResponse("manicule", 1, version);
  }

  public record StatusResponse(String service, int phase, int schemaVersion) {}
}
