package com.wellness.backend.controller;

import com.wellness.backend.dto.AdminAnalyticsDTO;
import com.wellness.backend.service.AdminAnalyticsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/analytics")
@PreAuthorize("hasRole('ADMIN')")
public class AdminAnalyticsController {

    @Autowired
    private AdminAnalyticsService analyticsService;

    @GetMapping
    public ResponseEntity<AdminAnalyticsDTO> getDashboardStats() {
        return ResponseEntity.ok(analyticsService.getDashboardAnalytics());
    }
}
