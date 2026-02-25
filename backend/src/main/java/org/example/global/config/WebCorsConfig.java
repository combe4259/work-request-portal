package org.example.global.config;

import org.example.global.team.TeamAccessInterceptor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.Arrays;

@Configuration
public class WebCorsConfig implements WebMvcConfigurer {

    private final String[] allowedOrigins;
    private final TeamAccessInterceptor teamAccessInterceptor;

    public WebCorsConfig(
            @Value("${app.cors.allowed-origins:http://localhost:5173,http://127.0.0.1:5173}") String allowedOrigins,
            ObjectProvider<TeamAccessInterceptor> teamAccessInterceptorProvider
    ) {
        this.allowedOrigins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .toArray(String[]::new);
        this.teamAccessInterceptor = teamAccessInterceptorProvider.getIfAvailable();
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(allowedOrigins)
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .maxAge(3600);
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        if (teamAccessInterceptor == null) {
            return;
        }

        registry.addInterceptor(teamAccessInterceptor)
                .addPathPatterns("/api/**")
                .excludePathPatterns("/api/auth/**", "/api/teams/**", "/api/users/me/**");
    }
}
