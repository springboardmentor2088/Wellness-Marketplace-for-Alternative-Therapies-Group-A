package com.wellness.backend.controller;

import com.wellness.backend.dto.BookSessionDTO;
import com.wellness.backend.dto.TherapySessionDTO;
import com.wellness.backend.service.TherapySessionService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.core.io.Resource;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.MediaType;

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

    // GET /api/sessions/user/{userId} — Get all sessions for a user
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<TherapySessionDTO>> getSessionsForUser(@PathVariable Integer userId) {
        return ResponseEntity.ok(therapySessionService.getSessionsForUser(userId));
    }

    // GET /api/sessions/all — Get all sessions globally
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/all")
    public ResponseEntity<List<TherapySessionDTO>> getAllSessions() {
        return ResponseEntity.ok(therapySessionService.getAllSessions());
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

    // PUT /api/sessions/{id}/accept — Accept a session request (Practitioner only)
    @PreAuthorize("hasRole('PRACTITIONER')")
    @PutMapping("/{id}/accept")
    public ResponseEntity<TherapySessionDTO> acceptSession(
            @PathVariable Integer id,
            @RequestBody Map<String, Integer> body) {
        Integer practitionerId = body.get("practitionerId");
        TherapySessionDTO session = therapySessionService.acceptSession(id, practitionerId);
        return ResponseEntity.ok(session);
    }

    // PUT /api/sessions/{id}/complete — Complete a session (Practitioner only)
    @PreAuthorize("hasRole('PRACTITIONER')")
    @PutMapping(value = "/{id}/complete", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<TherapySessionDTO> completeSession(
            @PathVariable Integer id,
            @RequestParam("practitionerId") Integer practitionerId,
            @RequestParam(value = "file", required = false) MultipartFile file) {
        TherapySessionDTO session = therapySessionService.completeSession(id, practitionerId, file);
        return ResponseEntity.ok(session);
    }

    // GET /api/sessions/{id}/document/download
    @PreAuthorize("hasAnyRole('PATIENT', 'PRACTITIONER', 'ADMIN')")
    @GetMapping("/{id}/document/download")
    public ResponseEntity<Resource> downloadPrescribedDocument(@PathVariable Integer id) {
        try {
            // Need a way to fetch the document URL from service securely.
            // Since we don't have a specific getSession method directly returning entity
            // here safely,
            // let's fetch the DTO and see if prescribedDocumentUrl is not null.
            // But wait, the DTO has "prescribedDocumentUrl" which contains the filesystem
            // path.
            // This is secure enough only if user has access to the session.
            return therapySessionService.downloadSessionDocument(id);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
