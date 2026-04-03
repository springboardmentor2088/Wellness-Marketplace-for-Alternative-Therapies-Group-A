package com.wellness.backend.service;

import com.wellness.backend.dto.PractitionerProfileDTO;
import com.wellness.backend.model.PractitionerProfile;
import com.wellness.backend.repository.PractitionerProfileRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class PractitionerRecommendationService {

    private static final Logger logger = LoggerFactory.getLogger(PractitionerRecommendationService.class);

    private final PractitionerProfileRepository practitionerRepository;
    private final PractitionerService practitionerService;

    @Autowired
    public PractitionerRecommendationService(
            PractitionerProfileRepository practitionerRepository,
            PractitionerService practitionerService) {
        this.practitionerRepository = practitionerRepository;
        this.practitionerService = practitionerService;
    }

    @Transactional(readOnly = true)
    public List<PractitionerProfileDTO> getRecommendedPractitioners(String suggestedSpecialty) {
        logger.info("Fetching recommended practitioners for specialty: {}", suggestedSpecialty);

        String specialtyKey = suggestedSpecialty;
        if (specialtyKey == null || specialtyKey.trim().isEmpty()) {
            specialtyKey = "General Physician";
        }
        
        // Map common variations to DB labels if needed, or normalize
        // Here we just ensure it's spaced correctly
        String dbSearchKey = specialtyKey.replace("_", " ");

        List<PractitionerProfile> topProfiles;
        if ("General Physician".equalsIgnoreCase(dbSearchKey) || 
            "General Doctor".equalsIgnoreCase(dbSearchKey) ||
            "General Medicine".equalsIgnoreCase(dbSearchKey)) {
            topProfiles = practitionerRepository.findAllOrderByCreatedAtDesc()
                    .stream()
                    .filter(PractitionerProfile::getVerified)
                    .limit(5)
                    .collect(Collectors.toList());
        } else {
            topProfiles = practitionerRepository.findTop5BySpecialty(
                dbSearchKey,
                PageRequest.of(0, 5)
            );
        }

        return topProfiles.stream()
                .map(practitionerService::mapToDTO)
                .collect(Collectors.toList());
    }

    public List<PractitionerProfileDTO> getRecommendedDoctors(String triageLevel, boolean isEmergency) {
        // Backward compatibility: treat triageLevel as the specialty key for now
        return getRecommendedPractitioners(triageLevel);
    }
}
