package com.wellness.backend.service;

import com.wellness.backend.dto.PractitionerProfileDTO;
import com.wellness.backend.dto.PractitionerCreateDTO;
import com.wellness.backend.dto.PractitionerUpdateDTO;
import com.wellness.backend.dto.OnboardingStatusDTO;
import com.wellness.backend.dto.PractitionerDocumentDTO;
import com.wellness.backend.model.PractitionerProfile;
import com.wellness.backend.model.PractitionerDocument;
import com.wellness.backend.model.User;
import com.wellness.backend.repository.PractitionerProfileRepository;
import com.wellness.backend.repository.PractitionerDocumentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class PractitionerService {

    private static final Logger logger = LoggerFactory.getLogger(PractitionerService.class);

    private final PractitionerProfileRepository practitionerRepository;
    private final PractitionerDocumentRepository documentRepository;
    private final UserService userService;
    private final EmailService emailService;

    @Autowired
    public PractitionerService(PractitionerProfileRepository practitionerRepository,
            PractitionerDocumentRepository documentRepository,
            UserService userService,
            EmailService emailService) {
        this.practitionerRepository = practitionerRepository;
        this.documentRepository = documentRepository;
        this.userService = userService;
        this.emailService = emailService;
    }

    // ================= GET ALL PRACTITIONERS =================
    @Transactional(readOnly = true)
    public List<PractitionerProfileDTO> getAllPractitioners() {
        return practitionerRepository.findAllOrderByCreatedAtDesc()
                .stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    // ================= GET VERIFIED PRACTITIONERS =================
    @Transactional(readOnly = true)
    public List<PractitionerProfileDTO> getAllVerifiedPractitioners() {
        return practitionerRepository.findByVerifiedTrue()
                .stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    // ================= GET BY PROFILE ID =================
    @Transactional(readOnly = true)
    public PractitionerProfileDTO getPractitionerById(Integer id) {
        PractitionerProfile practitioner = practitionerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Practitioner not found with id: " + id));

        return mapToDTO(practitioner);
    }

    // ================= GET BY USER ID =================
    @Transactional(readOnly = true)
    public PractitionerProfileDTO getPractitionerByUserId(Integer userId) {
        PractitionerProfile practitioner = practitionerRepository.findByUser_Id(userId)
                .orElseThrow(() -> new RuntimeException("Practitioner profile not found for user: " + userId));

        return mapToDTO(practitioner);
    }

    // ================= CREATE PRACTITIONER PROFILE (PRACTITIONER ONLY) =================
    @Transactional
    public PractitionerProfileDTO createPractitionerProfile(PractitionerCreateDTO createDTO) {
        User currentUser = userService.getCurrentAuthenticatedUser();

        // Check if user is a practitioner
        if (currentUser.getRole() != User.Role.PRACTITIONER) {
            throw new AccessDeniedException("Only practitioners can create a practitioner profile");
        }

        // Check if profile already exists
        if (practitionerRepository.existsByUser_Id(currentUser.getId())) {
            throw new RuntimeException("Practitioner profile already exists for this user");
        }

        PractitionerProfile profile = new PractitionerProfile();
        profile.setUser(currentUser);
        profile.setSpecialization(createDTO.getSpecialization());
        profile.setQualifications(createDTO.getQualifications());
        profile.setExperience(createDTO.getExperience());
        profile.setVerified(false); // Default to unverified
        profile.setRating(0.0f);

        return mapToDTO(practitionerRepository.save(profile));
    }

    // ================= UPDATE PRACTITIONER PROFILE =================
    @Transactional
    public PractitionerProfileDTO updatePractitionerProfile(
            Integer id,
            PractitionerUpdateDTO updateDTO) {

        User currentUser = userService.getCurrentAuthenticatedUser();

        PractitionerProfile profile = practitionerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Practitioner not found with id: " + id));

        // Allow owner OR ADMIN
        if (!profile.getUser().getId().equals(currentUser.getId())
                && currentUser.getRole() != User.Role.ADMIN) {
            throw new AccessDeniedException("You are not allowed to update this practitioner profile");
        }

        if (updateDTO.getSpecialization() != null) {
            profile.setSpecialization(updateDTO.getSpecialization());
        }

        if (updateDTO.getQualifications() != null) {
            profile.setQualifications(updateDTO.getQualifications());
        }

        if (updateDTO.getExperience() != null) {
            profile.setExperience(updateDTO.getExperience());
        }

        return mapToDTO(practitionerRepository.save(profile));
    }

    // ================= VERIFY PRACTITIONER (ADMIN ONLY) =================
    @Transactional
    public PractitionerProfileDTO verifyPractitioner(Integer id, Boolean verified) {

        User currentUser = userService.getCurrentAuthenticatedUser();

        // ADMIN only
        if (currentUser.getRole() != User.Role.ADMIN) {
            throw new AccessDeniedException("Only ADMIN can verify practitioners");
        }

        PractitionerProfile profile = practitionerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Practitioner not found with id: " + id));

        profile.setVerified(verified);

        PractitionerProfile savedProfile = practitionerRepository.save(profile);

        // Send approval email when practitioner is verified
        if (Boolean.TRUE.equals(verified)) {
            try {
                emailService.sendPractitionerVerifiedEmail(
                        profile.getUser().getName(),
                        profile.getUser().getEmail());
            } catch (Exception e) {
                logger.error("Verification email failed for practitioner {}: {}",
                        profile.getUser().getEmail(), e.getMessage());
            }
        }

        return mapToDTO(savedProfile);
    }

    // ================= DELETE PRACTITIONER PROFILE =================
    @Transactional
    public void deletePractitionerProfile(Integer id) {

        User currentUser = userService.getCurrentAuthenticatedUser();

        PractitionerProfile profile = practitionerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Practitioner not found with id: " + id));

        // Allow owner OR ADMIN
        if (!profile.getUser().getId().equals(currentUser.getId())
                && currentUser.getRole() != User.Role.ADMIN) {
            throw new AccessDeniedException("You are not allowed to delete this practitioner profile");
        }

        practitionerRepository.delete(profile);
    }

    // ================= SEARCH BY SPECIALIZATION =================
    @Transactional(readOnly = true)
    public List<PractitionerProfileDTO> searchBySpecialization(String specialization) {
        return practitionerRepository
                .findBySpecializationContainingIgnoreCase(specialization)
                .stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    // ================= GET ONBOARDING STATUS =================
    @Transactional(readOnly = true)
    public OnboardingStatusDTO getOnboardingStatus() {
        User currentUser = userService.getCurrentAuthenticatedUser();
        
        Optional<PractitionerProfile> profile = practitionerRepository.findByUser_Id(currentUser.getId());
        
        if (profile.isEmpty()) {
            return new OnboardingStatusDTO(false, false); // No profile exists
        }
        
        PractitionerProfile practitionerProfile = profile.get();
        return new OnboardingStatusDTO(true, practitionerProfile.getVerified()); // Profile exists and verification status
    }

    // ================= UPLOAD DOCUMENTS =================
    @Transactional
    public List<PractitionerDocumentDTO> uploadDocuments(Integer practitionerId, MultipartFile[] files) {
        User currentUser = userService.getCurrentAuthenticatedUser();
        
        PractitionerProfile practitioner = practitionerRepository.findById(practitionerId)
                .orElseThrow(() -> new RuntimeException("Practitioner not found with id: " + practitionerId));
        
        // Allow only the practitioner themselves or ADMIN
        if (!practitioner.getUser().getId().equals(currentUser.getId()) && currentUser.getRole() != User.Role.ADMIN) {
            throw new AccessDeniedException("You are not allowed to upload documents for this practitioner");
        }
        
        List<PractitionerDocumentDTO> uploadedDocs = new java.util.ArrayList<>();
        
        // Create upload directory if it doesn't exist
        String uploadDir = "uploads/practitioner_documents/" + practitionerId;
        try {
            Files.createDirectories(Paths.get(uploadDir));
        } catch (IOException e) {
            logger.error("Failed to create upload directory: {}", e.getMessage());
            throw new RuntimeException("Failed to create upload directory");
        }
        
        for (MultipartFile file : files) {
            if (!file.isEmpty() && "application/pdf".equals(file.getContentType())) {
                try {
                    // Generate unique filename
                    String uniqueFileName = UUID.randomUUID() + "_" + file.getOriginalFilename();
                    String filePath = uploadDir + "/" + uniqueFileName;
                    
                    // Save file
                    Files.write(Paths.get(filePath), file.getBytes());
                    
                    // Save document record in database
                    PractitionerDocument document = new PractitionerDocument(
                            practitioner,
                            file.getOriginalFilename(),
                            filePath,
                            file.getSize(),
                            file.getContentType()
                    );
                    
                    PractitionerDocument savedDoc = documentRepository.save(document);
                    uploadedDocs.add(mapDocumentToDTO(savedDoc));
                    
                    logger.info("Document uploaded successfully for practitioner {}: {}", practitionerId, file.getOriginalFilename());
                } catch (IOException e) {
                    logger.error("Failed to upload file {}: {}", file.getOriginalFilename(), e.getMessage());
                    throw new RuntimeException("Failed to upload file: " + file.getOriginalFilename());
                }
            }
        }
        
        return uploadedDocs;
    }

    // ================= GET DOCUMENTS FOR PRACTITIONER =================
    @Transactional(readOnly = true)
    public List<PractitionerDocumentDTO> getDocumentsForPractitioner(Integer practitionerId) {
        return documentRepository.findByPractitionerId(practitionerId)
                .stream()
                .map(this::mapDocumentToDTO)
                .collect(Collectors.toList());
    }

    // ================= GET MY DOCUMENTS (CURRENT PRACTITIONER) =================
    @Transactional(readOnly = true)
    public List<PractitionerDocumentDTO> getMyDocuments() {
        User currentUser = userService.getCurrentAuthenticatedUser();
        
        return documentRepository.findByPractitionerUserId(currentUser.getId())
                .stream()
                .map(this::mapDocumentToDTO)
                .collect(Collectors.toList());
    }

    // ================= DELETE DOCUMENT =================
    @Transactional
    public void deleteDocument(Integer documentId) {
        User currentUser = userService.getCurrentAuthenticatedUser();
        
        PractitionerDocument document = documentRepository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found with id: " + documentId));
        
        // Allow only the practitioner themselves or ADMIN
        if (!document.getPractitioner().getUser().getId().equals(currentUser.getId()) && currentUser.getRole() != User.Role.ADMIN) {
            throw new AccessDeniedException("You are not allowed to delete this document");
        }
        
        try {
            // Delete file from filesystem
            Files.deleteIfExists(Paths.get(document.getFilePath()));
        } catch (IOException e) {
            logger.warn("Failed to delete file from filesystem: {}", e.getMessage());
        }
        
        // Delete from database
        documentRepository.delete(document);
    }

    // ================= GET DOCUMENT BY ID (FOR DOWNLOAD) =================
    @Transactional(readOnly = true)
    public PractitionerDocument getDocumentById(Integer documentId) {
        User currentUser = userService.getCurrentAuthenticatedUser();

        PractitionerDocument document = documentRepository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found with id: " + documentId));

        if (!document.getPractitioner().getUser().getId().equals(currentUser.getId())
                && currentUser.getRole() != User.Role.ADMIN) {
            throw new AccessDeniedException("You are not allowed to access this document");
        }

        return document;
    }

    // ================= DOCUMENT DTO MAPPER =================
    private PractitionerDocumentDTO mapDocumentToDTO(PractitionerDocument document) {
        return new PractitionerDocumentDTO(
                document.getId(),
                document.getPractitioner().getId(),
                document.getFileName(),
                document.getFilePath(),
                document.getFileSize(),
                document.getFileType(),
                document.getUploadedAt()
        );
    }
    private PractitionerProfileDTO mapToDTO(PractitionerProfile profile) {

        PractitionerProfileDTO dto = new PractitionerProfileDTO();

        dto.setId(profile.getId());
        dto.setUserId(profile.getUser().getId());
        dto.setUserName(profile.getUser().getName());
        dto.setEmail(profile.getUser().getEmail());
        dto.setSpecialization(profile.getSpecialization());
        dto.setVerified(profile.getVerified());
        dto.setRating(profile.getRating());
        dto.setBio(profile.getUser().getBio());
        dto.setQualifications(profile.getQualifications());
        dto.setExperience(profile.getExperience());
        dto.setCreatedAt(profile.getCreatedAt());

        return dto;
    }
}
