package com.wellness.backend.config;

import com.wellness.backend.security.JwtAuthenticationFilter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    @Autowired
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Value("${app.ngrok.url:}")
    private String ngrokUrl;

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        List<String> allowedOrigins = new ArrayList<>(Arrays.asList(
                "http://localhost:5173", "http://localhost:5174", "http://localhost:3000"));
        if (ngrokUrl != null && !ngrokUrl.isBlank()) {
            allowedOrigins.add(ngrokUrl);
        }
        configuration.setAllowedOrigins(allowedOrigins);
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable())
                // Allow H2 Frame options if you are using it
                .headers(headers -> headers.frameOptions(frame -> frame.disable()))
                .authorizeHttpRequests(auth -> auth
                        // 1. PUBLIC ENDPOINTS
                        .requestMatchers("/", "/api/auth/**", "/h2-console/**", "/ws/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/practitioners", "/api/practitioners/verified",
                                "/api/practitioners/{id}")
                        .permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/availability/**").permitAll()

                        // 2. AVAILABILITY - POST/PUT requires PRACTITIONER (must be before generic
                        // rules)
                        .requestMatchers(HttpMethod.POST, "/api/availability/**").hasAnyRole("PRACTITIONER", "ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/availability/**").hasAnyRole("PRACTITIONER", "ADMIN")

                        // 3. SESSIONS - authenticated users can access
                        .requestMatchers("/api/sessions/**").authenticated()
                        .requestMatchers("/api/notifications/**").authenticated()

                        // 4. ONBOARDING & PROFILE CREATION (Must be authenticated)
                        .requestMatchers(HttpMethod.POST, "/api/practitioners").authenticated()

                        // 5. PRACTITIONER SPECIFIC (Onboarding status, uploads, etc.)
                        .requestMatchers("/api/practitioners/me/**").hasRole("PRACTITIONER")
                        .requestMatchers("/api/practitioners/*/documents/**").hasAnyRole("PRACTITIONER", "ADMIN")
                        .requestMatchers("/api/practitioners/user/**").hasAnyRole("PRACTITIONER", "ADMIN")
                        .requestMatchers("/api/practitioners/requests/**").authenticated()

                        // 6. ROLE-BASED DASHBOARDS
                        .requestMatchers("/api/practitioner/**").hasRole("PRACTITIONER")
                        .requestMatchers("/api/user/**").hasRole("PATIENT")
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")

                        .anyRequest().authenticated())
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS));

        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}