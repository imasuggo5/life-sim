package com.lifesim.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/** Entry point for the backend Spring Boot application. */
@SpringBootApplication
public class BackendApplication {

  /**
   * Starts the Spring Boot application.
   *
   * @param args command-line arguments
   */
  public static void main(String[] args) {
    SpringApplication.run(BackendApplication.class, args);
  }
}
