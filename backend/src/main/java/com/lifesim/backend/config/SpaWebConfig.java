package com.lifesim.backend.config;

import java.io.IOException;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

/**
 * Serves the embedded React production build from classpath:/static/ and falls back to index.html
 * for unknown paths so client-side routing works. Requests handled by {@code @RestController}
 * mappings (e.g. /api/**) take precedence over this resource handler. Only relevant for the
 * production build; local development serves the frontend separately via the Vite dev server.
 */
@Configuration
public class SpaWebConfig implements WebMvcConfigurer {

  @Override
  public void addResourceHandlers(ResourceHandlerRegistry registry) {
    registry
        .addResourceHandler("/**")
        .addResourceLocations("classpath:/static/")
        .resourceChain(true)
        .addResolver(
            new PathResourceResolver() {
              @Override
              protected Resource getResource(String resourcePath, Resource location)
                  throws IOException {
                Resource requested = location.createRelative(resourcePath);
                return requested.exists() && requested.isReadable()
                    ? requested
                    : new ClassPathResource("/static/index.html");
              }
            });
  }
}
