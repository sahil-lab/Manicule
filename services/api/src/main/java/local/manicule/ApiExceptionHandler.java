package local.manicule;

import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

@RestControllerAdvice
public class ApiExceptionHandler extends ResponseEntityExceptionHandler {
  private static final Logger LOG = LoggerFactory.getLogger(ApiExceptionHandler.class);

  @Override
  protected ResponseEntity<Object> handleMethodArgumentNotValid(
      MethodArgumentNotValidException exception,
      HttpHeaders headers,
      HttpStatusCode status,
      WebRequest request) {
    ProblemDetail problem =
        problem(HttpStatus.BAD_REQUEST, "Validation failed", "Correct the listed fields.");
    Map<String, String> errors = new LinkedHashMap<>();
    exception.getBindingResult().getFieldErrors().stream()
        .sorted(
            java.util.Comparator.comparing(org.springframework.validation.FieldError::getField)
                .thenComparing(error -> String.valueOf(error.getDefaultMessage())))
        .forEach(error -> errors.putIfAbsent(error.getField(), error.getDefaultMessage()));
    problem.setProperty("errors", errors);
    return handleExceptionInternal(exception, problem, headers, status, request);
  }

  @Override
  protected ResponseEntity<Object> handleHttpMessageNotReadable(
      HttpMessageNotReadableException exception,
      HttpHeaders headers,
      HttpStatusCode status,
      WebRequest request) {
    return handleExceptionInternal(
        exception,
        problem(
            HttpStatus.BAD_REQUEST,
            "Invalid JSON request",
            "Send a JSON object with only string fields named name and version."),
        headers,
        status,
        request);
  }

  @ExceptionHandler(DataAccessException.class)
  public ResponseEntity<ProblemDetail> handleDatabaseUnavailable(DataAccessException exception) {
    LOG.error("event=database_unavailable");
    return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
        .body(
            problem(
                HttpStatus.SERVICE_UNAVAILABLE,
                "Database unavailable",
                "Cannot read the local database. Retry when it is ready."));
  }

  static ProblemDetail problem(HttpStatus status, String title, String detail) {
    ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
    problem.setTitle(title);
    problem.setProperty("requestId", MDC.get("requestId"));
    return problem;
  }
}
