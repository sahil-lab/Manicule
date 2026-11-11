package local.manicule;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class SkeletonIT {
  @Autowired private MockMvc mvc;
  @Autowired private JdbcTemplate jdbc;

  @Test
  void migrationAndDatabaseBackedStatusAreReal() throws Exception {
    assertThat(
            jdbc.queryForObject(
                "SELECT count(*) FROM flyway_schema_history WHERE version = '1' AND success",
                Integer.class))
        .isEqualTo(1);
    assertThat(jdbc.queryForObject("SELECT count(*) FROM flyway_schema_history", Integer.class))
        .isEqualTo(1);
    mvc.perform(get("/api/status"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.service").value("manicule"))
        .andExpect(jsonPath("$.schemaVersion").value(1));
    mvc.perform(get("/actuator/health/readiness"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("UP"))
        .andExpect(jsonPath("$.components").doesNotExist());
  }

  @Test
  void applicationRoleHasNoAdministrativePrivileges() {
    assertThat(
            jdbc.queryForObject(
                "SELECT rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication "
                    + "FROM pg_roles WHERE rolname = current_user",
                Boolean.class))
        .isFalse();
    assertThat(jdbc.queryForObject("SELECT current_user", String.class)).isEqualTo("manicule");
  }

  @Test
  void preflightDoesNotWriteToTheDatabase() throws Exception {
    var before = jdbc.queryForList("SELECT * FROM skeleton_metadata");
    for (int attempt = 0; attempt < 2; attempt++) {
      mvc.perform(
              post("/api/preflight")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{\"name\":\"Synthetic Pets\",\"version\":\"1\"}"))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.persisted").value(false));
    }
    assertThat(jdbc.queryForList("SELECT * FROM skeleton_metadata")).isEqualTo(before);
    assertThat(
            jdbc.queryForList(
                "SELECT table_name FROM information_schema.tables "
                    + "WHERE table_schema = 'public' AND table_type = 'BASE TABLE'",
                String.class))
        .containsExactlyInAnyOrder("skeleton_metadata", "flyway_schema_history");
  }

  @Test
  void domainRoutesAndUnexposedActuatorsAreNotImplemented() throws Exception {
    mvc.perform(post("/apis").contentType(MediaType.APPLICATION_JSON).content("{}"))
        .andExpect(status().isNotFound());
    mvc.perform(post("/benchmarks").contentType(MediaType.APPLICATION_JSON).content("{}"))
        .andExpect(status().isNotFound());
    mvc.perform(get("/benchmarks/123/results")).andExpect(status().isNotFound());
    mvc.perform(get("/actuator/env")).andExpect(status().isNotFound());
  }
}
