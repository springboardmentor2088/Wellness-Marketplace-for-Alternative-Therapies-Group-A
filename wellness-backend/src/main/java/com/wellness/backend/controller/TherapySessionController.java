package com.wellness.backend.controller;

import com.wellness.backend.dto.BookSessionDTO;
import com.wellness.backend.dto.RescheduleSessionDTO;
import com.wellness.backend.dto.TherapySessionDTO;
import com.wellness.backend.service.TherapySessionService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/sessions")
public class TherapySessionController {

    @Autowired
    private TherapySessionService therapySessionService;

    // POST /api/sessions/book — Book a new session
    @PreAuthorize("hasAnyRole('PATIENT', 'PRACTITIONER', 'ADMIN')")
    @PostMapping("/book")
    public ResponseEntity<TherapySessionDTO> bookSession(
            @Valid @RequestBody BookSessionDTO dto,
            Authentication authentication) {
        String userEmail = authentication.getName();
        TherapySessionDTO session = therapySessionService.bookSession(dto, userEmail);
        return ResponseEntity.ok(session);
    }

    // PUT /api/sessions/{id}/cancel — Cancel a session
    @PreAuthorize("hasAnyRole('PATIENT', 'PRACTITIONER', 'ADMIN')")
    @PutMapping("/{id}/cancel")
    public ResponseEntity<TherapySessionDTO> cancelSession(
            @PathVariable Integer id,
            @RequestBody Map<String, String> body) {
        String cancelledBy = body.getOrDefault("cancelledBy", "USER");
        String reason = body.getOrDefault("reason", "");
        TherapySessionDTO session = therapySessionService.cancelSession(id, cancelledBy, reason);
        return ResponseEntity.ok(session);
    }

    // PUT /api/sessions/{id}/reschedule — Reschedule a session
    @PreAuthorize("hasAnyRole('PATIENT', 'PRACTITIONER', 'ADMIN')")
    @PutMapping("/{id}/reschedule")
    public ResponseEntity<TherapySessionDTO> rescheduleSession(
            @PathVariable Integer id,
            @Valid @RequestBody RescheduleSessionDTO dto) {
        TherapySessionDTO session = therapySessionService.rescheduleSession(id, dto);
        return ResponseEntity.ok(session);
    }

    // GET /api/sessions/user/{userId} — Get all sessions for a user
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<TherapySessionDTO>> getSessionsForUser(@PathVariable Integer userId) {
        return ResponseEntity.ok(therapySessionService.getSessionsForUser(userId));
    }

    // GET /api/sessions/practitioner/{practitionerId} — Get all sessions for a
    // practitioner
    @GetMapping("/practitioner/{practitionerId}")
    public ResponseEntity<List<TherapySessionDTO>> getSessionsForPractitioner(
            @PathVariable Integer practitionerId) {
        return ResponseEntity.ok(therapySessionService.getSessionsForPractitioner(practitionerId));
    }

    // GET /api/sessions/{practitionerId}/slots?date=YYYY-MM-DD — Get available time
    // slots
    @GetMapping("/{practitionerId}/slots")
    public ResponseEntity<List<String>> getAvailableSlots(
            @PathVariable Integer practitionerId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(therapySessionService.getAvailableSlots(practitionerId, date));
    }
}
