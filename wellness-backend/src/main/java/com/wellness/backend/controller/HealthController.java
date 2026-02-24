package com.wellness.backend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
public class HealthController {

    @GetMapping("/")
    public ResponseEntity<Map<String, String>> health() {
        Map<String, String> response = new HashMap<>();
        response.put("status", "API is running");
        response.put("message", "Wellness Backend API");
        response.put("version", "1.0.0");
        response.put("baseUrl", "http://localhost:8081");
        response.put("endpoints", "GET /api/practitioners, POST /api/auth/login, POST /api/auth/register");
        return ResponseEntity.ok(response);
    }
}
