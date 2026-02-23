package com.wellness.backend.controller;

import com.wellness.backend.dto.PractitionerProfileDTO;
import com.wellness.backend.dto.PractitionerCreateDTO;
import com.wellness.backend.dto.PractitionerUpdateDTO;
import com.wellness.backend.dto.OnboardingStatusDTO;
import com.wellness.backend.dto.PractitionerDocumentDTO;
import com.wellness.backend.model.PractitionerDocument;
import com.wellness.backend.service.PractitionerService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.net.MalformedURLException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

@RestController
@RequestMapping("/api/practitioners")
public class PractitionerController {

    private final PractitionerService practitionerService;

    @Autowired
    public PractitionerController(PractitionerService practitionerService) {
        this.practitionerService = practitionerService;
    }

    // ================= GET ALL (PUBLIC) =================
    @GetMapping
    public ResponseEntity<List<PractitionerProfileDTO>> getAllPractitioners() {
        return ResponseEntity.ok(practitionerService.getAllPractitioners());
    }

    // ================= GET VERIFIED (PUBLIC) =================
    @GetMapping("/verified")
    public ResponseEntity<List<PractitionerProfileDTO>> getVerifiedPractitioners() {
        return ResponseEntity.ok(practitionerService.getAllVerifiedPractitioners());
    }

    // ================= CREATE PROFILE (AUTHENTICATED USERS) =================
    @PreAuthorize("isAuthenticated()")
    @PostMapping
    public ResponseEntity<PractitionerProfileDTO> createPractitionerProfile(
            @Valid @RequestBody PractitionerCreateDTO createDTO) {

        return ResponseEntity.ok(practitionerService.createPractitionerProfile(createDTO));
    }

    // ================= GET BY ID (PUBLIC) =================
    @GetMapping("/{id}")
    public ResponseEntity<PractitionerProfileDTO> getPractitionerById(
            @PathVariable Integer id) {

        return ResponseEntity.ok(practitionerService.getPractitionerById(id));
    }

    // ================= GET BY USER ID (PRACTITIONER / ADMIN) =================
    @PreAuthorize("hasAnyRole('PRACTITIONER','ADMIN')")
    @GetMapping("/user/{userId}")
    public ResponseEntity<PractitionerProfileDTO> getPractitionerByUserId(
            @PathVariable Integer userId) {

        return ResponseEntity.ok(practitionerService.getPractitionerByUserId(userId));
    }

    // ================= CHECK ONBOARDING STATUS (PRACTITIONER) =================
    @PreAuthorize("hasRole('PRACTITIONER')")
    @GetMapping("/me/onboarding-status")
    public ResponseEntity<OnboardingStatusDTO> getOnboardingStatus() {
        return ResponseEntity.ok(practitionerService.getOnboardingStatus());
    }

    // ================= UPDATE PROFILE (PRACTITIONER ONLY) =================
    @PreAuthorize("hasRole('PRACTITIONER')")
    @PutMapping("/{id}")
    public ResponseEntity<PractitionerProfileDTO> updatePractitionerProfile(
            @PathVariable Integer id,
            @Valid @RequestBody PractitionerUpdateDTO updateDTO) {

        return ResponseEntity.ok(
                practitionerService.updatePractitionerProfile(id, updateDTO));
    }

    // ================= VERIFY PROFILE (ADMIN ONLY) =================
    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}/verify")
    public ResponseEntity<PractitionerProfileDTO> verifyPractitioner(
            @PathVariable Integer id,
            @RequestParam Boolean verified) {

        return ResponseEntity.ok(
                practitionerService.verifyPractitioner(id, verified));
    }

    // ================= DELETE PROFILE (ADMIN ONLY) =================
    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePractitionerProfile(
            @PathVariable Integer id) {

        practitionerService.deletePractitionerProfile(id);
        return ResponseEntity.noContent().build();
    }

    // ================= SEARCH (PUBLIC) =================
    @GetMapping("/search")
    public ResponseEntity<List<PractitionerProfileDTO>> searchBySpecialization(
            @RequestParam String specialization) {

        return ResponseEntity.ok(
                practitionerService.searchBySpecialization(specialization));
    }

    // ================= UPLOAD DOCUMENTS (PRACTITIONER ONLY) =================
    @PreAuthorize("hasRole('PRACTITIONER')")
    @PostMapping("/{practitionerId}/documents/upload")
    public ResponseEntity<List<PractitionerDocumentDTO>> uploadDocuments(
            @PathVariable Integer practitionerId,
            @RequestParam("files") MultipartFile[] files) {

        return ResponseEntity.ok(
                practitionerService.uploadDocuments(practitionerId, files));
    }

    // ================= GET ALL DOCUMENTS FOR A PRACTITIONER (ADMIN) =================
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/{practitionerId}/documents")
    public ResponseEntity<List<PractitionerDocumentDTO>> getDocumentsForPractitioner(
            @PathVariable Integer practitionerId) {

        return ResponseEntity.ok(
                practitionerService.getDocumentsForPractitioner(practitionerId));
    }

    // ================= GET DOCUMENTS FOR CURRENT PRACTITIONER =================
    @PreAuthorize("hasRole('PRACTITIONER')")
    @GetMapping("/me/documents")
    public ResponseEntity<List<PractitionerDocumentDTO>> getMyDocuments() {

        return ResponseEntity.ok(practitionerService.getMyDocuments());
    }

    // ================= DELETE DOCUMENT (ADMIN/PRACTITIONER) =================
    @PreAuthorize("hasAnyRole('PRACTITIONER','ADMIN')")
    @DeleteMapping("/documents/{documentId}")
    public ResponseEntity<Void> deleteDocument(
            @PathVariable Integer documentId) {

        practitionerService.deleteDocument(documentId);
        return ResponseEntity.noContent().build();
    }

    // ================= DOWNLOAD DOCUMENT (ADMIN/PRACTITIONER) =================
    @PreAuthorize("hasAnyRole('PRACTITIONER','ADMIN')")
    @GetMapping("/documents/{documentId}/download")
    public ResponseEntity<Resource> downloadDocument(
            @PathVariable Integer documentId) {

        PractitionerDocument document = practitionerService.getDocumentById(documentId);

        try {
            Path filePath = Paths.get(document.getFilePath()).toAbsolutePath().normalize();
            Resource resource = new org.springframework.core.io.UrlResource(filePath.toUri());

            if (!resource.exists()) {
                return ResponseEntity.notFound().build();
            }

            String contentType = document.getFileType();
            if (contentType == null || contentType.isBlank()) {
                contentType = "application/pdf";
            }

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "inline; filename=\"" + document.getFileName() + "\"")
                    .header(HttpHeaders.CONTENT_TYPE, contentType)
                    .body(resource);
        } catch (MalformedURLException e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
