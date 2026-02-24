package com.wellness.backend.controller;

import com.wellness.backend.dto.PractitionerRequestDTO;
import com.wellness.backend.model.PractitionerRequest;
import com.wellness.backend.service.PractitionerRequestService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/practitioners/requests")
public class PractitionerRequestController {

    private final PractitionerRequestService requestService;

    @Autowired
    public PractitionerRequestController(PractitionerRequestService requestService) {
        this.requestService = requestService;
    }

    // ================= GET ALL REQUESTS (FOR ADMIN ONLY) =================
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/all")
    public ResponseEntity<List<PractitionerRequestDTO>> getAllRequests() {
        List<PractitionerRequestDTO> requests = requestService.getAllRequests();
        return ResponseEntity.ok(requests);
    }

    // ================= GET ALL REQUESTS FOR PRACTITIONER (LATEST FIRST) =================
    @PreAuthorize("hasAnyRole('PRACTITIONER', 'ADMIN')")
    @GetMapping("/practitioner/{practitionerId}")
    public ResponseEntity<List<PractitionerRequestDTO>> getRequestsForPractitioner(
            @PathVariable Integer practitionerId) {
        List<PractitionerRequestDTO> requests = requestService.getRequestsForPractitioner(practitionerId);
        return ResponseEntity.ok(requests);
    }

    // ================= GET PENDING REQUESTS FOR PRACTITIONER (LATEST FIRST) =================
    @PreAuthorize("hasAnyRole('PRACTITIONER', 'ADMIN')")
    @GetMapping("/practitioner/{practitionerId}/pending")
    public ResponseEntity<List<PractitionerRequestDTO>> getPendingRequestsForPractitioner(
            @PathVariable Integer practitionerId) {
        List<PractitionerRequestDTO> requests = requestService.getPendingRequestsForPractitioner(practitionerId);
        return ResponseEntity.ok(requests);
    }

    // ================= GET REQUESTS BY STATUS =================
    @PreAuthorize("hasAnyRole('PRACTITIONER', 'ADMIN')")
    @GetMapping("/practitioner/{practitionerId}/by-status")
    public ResponseEntity<List<PractitionerRequestDTO>> getRequestsByStatus(
            @PathVariable Integer practitionerId,
            @RequestParam String status) {
        List<PractitionerRequestDTO> requests = requestService.getRequestsByStatus(practitionerId, status);
        return ResponseEntity.ok(requests);
    }

    // ================= GET REQUESTS BY PRIORITY =================
    @PreAuthorize("hasAnyRole('PRACTITIONER', 'ADMIN')")
    @GetMapping("/practitioner/{practitionerId}/by-priority")
    public ResponseEntity<List<PractitionerRequestDTO>> getRequestsByPriority(
            @PathVariable Integer practitionerId,
            @RequestParam String priority) {
        List<PractitionerRequestDTO> requests = requestService.getRequestsByPriority(practitionerId, priority);
        return ResponseEntity.ok(requests);
    }

    // ================= GET REQUEST BY ID =================
    @PreAuthorize("hasAnyRole('PATIENT', 'PRACTITIONER', 'ADMIN')")
    @GetMapping("/{requestId}")
    public ResponseEntity<PractitionerRequestDTO> getRequestById(
            @PathVariable Integer requestId) {
        PractitionerRequestDTO request = requestService.getRequestById(requestId);
        return ResponseEntity.ok(request);
    }

    // ================= CREATE REQUEST (PATIENT ONLY) =================
    @PreAuthorize("hasRole('PATIENT')")
    @PostMapping("/create/{practitionerId}")
    public ResponseEntity<PractitionerRequestDTO> createRequest(
            @PathVariable Integer practitionerId,
            @RequestBody PractitionerRequest request) {
        PractitionerRequestDTO createdRequest = requestService.createRequest(practitionerId, request);
        return ResponseEntity.ok(createdRequest);
    }

    // ================= ACCEPT REQUEST (PRACTITIONER ONLY) =================
    @PreAuthorize("hasAnyRole('PRACTITIONER', 'ADMIN')")
    @PutMapping("/{requestId}/accept")
    public ResponseEntity<PractitionerRequestDTO> acceptRequest(
            @PathVariable Integer requestId) {
        PractitionerRequestDTO updatedRequest = requestService.acceptRequest(requestId);
        return ResponseEntity.ok(updatedRequest);
    }

    // ================= REJECT REQUEST (PRACTITIONER ONLY) =================
    @PreAuthorize("hasAnyRole('PRACTITIONER', 'ADMIN')")
    @PutMapping("/{requestId}/reject")
    public ResponseEntity<PractitionerRequestDTO> rejectRequest(
            @PathVariable Integer requestId,
            @RequestParam String reason) {
        PractitionerRequestDTO updatedRequest = requestService.rejectRequest(requestId, reason);
        return ResponseEntity.ok(updatedRequest);
    }

    // ================= COMPLETE REQUEST (PRACTITIONER ONLY) =================
    @PreAuthorize("hasAnyRole('PRACTITIONER', 'ADMIN')")
    @PutMapping("/{requestId}/complete")
    public ResponseEntity<PractitionerRequestDTO> completeRequest(
            @PathVariable Integer requestId) {
        PractitionerRequestDTO updatedRequest = requestService.completeRequest(requestId);
        return ResponseEntity.ok(updatedRequest);
    }

    // ================= CANCEL REQUEST =================
    @PreAuthorize("hasAnyRole('PATIENT', 'PRACTITIONER', 'ADMIN')")
    @PutMapping("/{requestId}/cancel")
    public ResponseEntity<PractitionerRequestDTO> cancelRequest(
            @PathVariable Integer requestId) {
        PractitionerRequestDTO updatedRequest = requestService.cancelRequest(requestId);
        return ResponseEntity.ok(updatedRequest);
    }

    // ================= COUNT PENDING REQUESTS =================
    @PreAuthorize("hasAnyRole('PRACTITIONER', 'ADMIN')")
    @GetMapping("/practitioner/{practitionerId}/pending-count")
    public ResponseEntity<Long> countPendingRequests(
            @PathVariable Integer practitionerId) {
        long count = requestService.countPendingRequests(practitionerId);
        return ResponseEntity.ok(count);
    }
}
