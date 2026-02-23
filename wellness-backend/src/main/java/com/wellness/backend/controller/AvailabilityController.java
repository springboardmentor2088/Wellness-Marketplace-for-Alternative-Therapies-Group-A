package com.wellness.backend.controller;

import com.wellness.backend.dto.AvailabilityDTO;
import com.wellness.backend.dto.SetAvailabilityDTO;
import com.wellness.backend.service.AvailabilityService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/availability")
public class AvailabilityController {

    @Autowired
    private AvailabilityService availabilityService;

    // GET /api/availability/{practitionerId} — Get availability for a practitioner
    @GetMapping("/{practitionerId}")
    public ResponseEntity<List<AvailabilityDTO>> getAvailability(@PathVariable Integer practitionerId) {
        return ResponseEntity.ok(availabilityService.getAvailability(practitionerId));
    }

    // POST /api/availability/{practitionerId} — Set/update availability for a day
    @PreAuthorize("hasAnyRole('PRACTITIONER', 'ADMIN')")
    @PostMapping("/{practitionerId}")
    public ResponseEntity<AvailabilityDTO> setAvailability(
            @PathVariable Integer practitionerId,
            @Valid @RequestBody SetAvailabilityDTO dto) {
        return ResponseEntity.ok(availabilityService.setAvailability(practitionerId, dto));
    }
}
