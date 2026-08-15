package com.lifesim.backend.interfaces;

import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** Exposes a liveness endpoint for health checks. */
@RestController
public class HealthController {

  /**
   * Reports that the service is up.
   *
   * @return a status map, always {@code {"status": "ok"}}
   */
  @GetMapping("/api/health")
  public Map<String, String> health() {
    return Map.of("status", "ok");
  }
}
