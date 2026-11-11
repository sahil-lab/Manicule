package local.manicule;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class RequestSafetyFilter extends OncePerRequestFilter {
  static final int MAX_BODY_BYTES = 8192;
  private static final Logger LOG = LoggerFactory.getLogger(RequestSafetyFilter.class);
  private final ObjectMapper mapper;

  public RequestSafetyFilter(ObjectMapper mapper) {
    this.mapper = mapper;
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {
    long started = System.nanoTime();
    MDC.put("requestId", UUID.randomUUID().toString());
    response.setHeader("X-Request-Id", MDC.get("requestId"));
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Cache-Control", "no-store");
    try {
      if (request.getContentLengthLong() > MAX_BODY_BYTES) {
        rejectOversize(response);
        return;
      }
      // Read at most one byte over the limit so chunked bodies cannot bypass it.
      byte[] body = request.getInputStream().readNBytes(MAX_BODY_BYTES + 1);
      if (body.length > MAX_BODY_BYTES) {
        rejectOversize(response);
        return;
      }
      chain.doFilter(new BufferedRequest(request, body), response);
    } finally {
      LOG.info(
          "event=http_request method={} status={} duration_ms={}",
          request.getMethod(),
          response.getStatus(),
          (System.nanoTime() - started) / 1_000_000);
      MDC.remove("requestId");
    }
  }

  private void rejectOversize(HttpServletResponse response) throws IOException {
    response.setStatus(HttpStatus.PAYLOAD_TOO_LARGE.value());
    response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
    mapper.writeValue(
        response.getOutputStream(),
        ApiExceptionHandler.problem(
            HttpStatus.PAYLOAD_TOO_LARGE,
            "Request too large",
            "Request bodies must not exceed 8192 bytes."));
  }

  private static final class BufferedRequest extends HttpServletRequestWrapper {
    private final byte[] body;

    private BufferedRequest(HttpServletRequest request, byte[] body) {
      super(request);
      this.body = body;
    }

    @Override
    public ServletInputStream getInputStream() {
      ByteArrayInputStream input = new ByteArrayInputStream(body);
      return new ServletInputStream() {
        @Override
        public int read() {
          return input.read();
        }

        @Override
        public int read(byte[] bytes, int offset, int length) {
          return input.read(bytes, offset, length);
        }

        @Override
        public boolean isFinished() {
          return input.available() == 0;
        }

        @Override
        public boolean isReady() {
          return true;
        }

        @Override
        public void setReadListener(ReadListener listener) {
          throw new UnsupportedOperationException("Only blocking MVC requests are supported.");
        }
      };
    }
  }
}
