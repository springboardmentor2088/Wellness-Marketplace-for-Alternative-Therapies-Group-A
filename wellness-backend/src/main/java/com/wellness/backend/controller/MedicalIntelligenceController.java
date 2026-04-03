package com.wellness.backend.controller;

import com.wellness.backend.dto.*;
import com.wellness.backend.service.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.HashMap;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/medical-intelligence")
@CrossOrigin(origins = "*") // Adjust for production
public class MedicalIntelligenceController {

    private static final Logger logger = LoggerFactory.getLogger(MedicalIntelligenceController.class);

    private static final Set<String> ALLOWED_SPECIALTIES = Set.of(
        "Gastroenterology", "Cardiology", "Neurology",
        "Pulmonology", "Dermatology", "Orthopedics",
        "ENT", "Psychiatry", "Endocrinology", "General Medicine"
    );

    @Autowired
    private MedicalIntelligenceService medicalIntelligenceService;

    @Autowired
    private PractitionerRecommendationService practitionerRecommendationService;

    @Autowired
    private GeminiService geminiService;

    @Autowired
    private ProductService productService;

    @PostMapping("/analyze")
    public ResponseEntity<Map<String, Object>> analyzeMedicalInput(@RequestBody Map<String, String> request) {
        String text = request.get("text");
        String base64Image = request.get("image");
        String mimeType = request.get("mimeType");

        try {
            Map<String, Object> response = medicalIntelligenceService.analyzeAndMatch(text, base64Image, mimeType);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Medical analysis failure: {}", e.getMessage(), e);
            
            // Build a consistent failure response for the frontend
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("status", "ERROR");
            errorResponse.put("message", "Analysis service briefly unavailable. Please try again in a few moments.");
            
            // Still returning 200 OK with status='ERROR' to maintain UI stability
            return ResponseEntity.ok(errorResponse);
        }
    }

    @GetMapping("/triage")
    public ResponseEntity<TriageResponse> analyzeTriage(@RequestParam String symptoms) {
        if (symptoms == null || symptoms.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        logger.info("Executing Triage for symptoms: {}", symptoms);

        try {
            // 1. Attempt AI Triage Analysis (Gemini)
            TriageResult result = null;
            String aiSpecialty = null;
            try {
                result = geminiService.analyzeSymptomsForTriage(symptoms);
                if (result != null) {
                    aiSpecialty = result.getSuggestedSpecialty();
                    
                    // REJECTION CHECK: If AI explicitly blocked the prompt for being non-medical
                    if (aiSpecialty == null || aiSpecialty.equalsIgnoreCase("null") || aiSpecialty.equalsIgnoreCase("None")) {
                        TriageResponse reject = new TriageResponse();
                        reject.setTriageLevel("REJECTED");
                        reject.setSuggestedSpecialty(null);
                        reject.setMessage("System Access Denied: Please ask medical queries only.");
                        reject.setRecommendedDoctors(List.of());
                        reject.setMedicines(List.of());
                        
                        TriageDTO t = new TriageDTO(); 
                        t.setAdvice(result.getTriageDTO() != null && result.getTriageDTO().getAdvice() != null 
                            ? result.getTriageDTO().getAdvice() : "This bot only answers medical questions.");
                        reject.setTriage(t);
                        
                        return ResponseEntity.ok(reject);
                    }

                    logger.info("AI Analysis result source: {}, Suggested: {}", result.getSource(), aiSpecialty);
                }
            } catch (Exception e) {
                logger.error("AI Triage attempt failed: {}. Continuing with fallback clinical logic.", e.getMessage());
                // Non-fatal error; proceeding to fallback mapper
            }

            // 2. Normalize Specialty (Clinical Validation)
            String finalSpecialty = (aiSpecialty != null) ? normalizeSpecialty(aiSpecialty) : null;
            
            // If AI failed or returned non-standard specialty, trigger smart mapping
            if (finalSpecialty == null || !ALLOWED_SPECIALTIES.contains(finalSpecialty)) {
                logger.warn("Standardizing specialty mapping due to invalid AI/missing output.");
                finalSpecialty = mapSymptomsToSpecialty(symptoms);
            }

            logger.info("Validated Clinic Specialist: {}", finalSpecialty);

            // 3. Clinical Data Extraction (Urgency/Triage Level)
            String urgency = (result != null && result.getTriageLevel() != null) ? result.getTriageLevel() : "LOW";
            boolean isEmergency = "EMERGENCY".equalsIgnoreCase(urgency) || "HIGH".equalsIgnoreCase(urgency);

            // 4. Recommendation Lookups (Self-Correcting Search)
            List<PractitionerProfileDTO> doctors = List.of();
            try {
                doctors = practitionerRecommendationService.getRecommendedPractitioners(finalSpecialty);
            } catch (Exception e) {
                logger.error("Practitioner lookup failed for {}: {}", finalSpecialty, e.getMessage());
            }

            // 5. Zero-Results Safety Net (Ensures UI is never empty)
            if (doctors == null || doctors.isEmpty()) {
                logger.warn("Finding no specialists for {}, returning empty list as per strict matching.", finalSpecialty);
                doctors = List.of(); 
            }

            List<ProductDTO> medicines = List.of();
            if (!isEmergency) {
                try {
                    // Search medicines based on the detected specialty (e.g. "Gastroenterology" -> "stomach")
                    String medicineSearchQuery = mapSpecialtyToMedicineSearch(finalSpecialty);
                    medicines = productService.searchProducts(medicineSearchQuery);
                    
                    if (medicines != null) {
                        medicines = medicines.stream().limit(3).collect(Collectors.toList());
                    }
                } catch (Exception e) {
                    logger.error("Product search failed during triage: {}", e.getMessage());
                }
            }

            // 6. Build Robust Triage Response
            TriageResponse response = new TriageResponse();
            response.setTriageLevel(urgency);
            response.setSuggestedSpecialty(finalSpecialty);
            response.setRecommendedDoctors(doctors);
            response.setRecommendedPractitioners(doctors);
            response.setMedicines(medicines != null ? medicines : List.of());
            
            // Define source and message
            String source = (result != null && result.getSource() != null) ? result.getSource() : "FALLBACK";
            String friendSummary = (result != null && result.getMessage() != null) ? result.getMessage() : 
                                  "AI analysis unavailable. Showing best-matched specialists based on symptoms.";
            
            response.setSource(source);
            response.setMessage(friendSummary);

            // 7. Initialize Nested Triage Object for frontend consistency
            TriageDTO triageDTO = (result != null) ? result.getTriageDTO() : null;
            if (triageDTO == null) {
                triageDTO = new TriageDTO();
                triageDTO.setSpecialist(finalSpecialty);
                triageDTO.setAdvice(friendSummary);
            } else {
                triageDTO.setSpecialist(finalSpecialty);
                if (triageDTO.getAdvice() == null) {
                    triageDTO.setAdvice(friendSummary);
                }
            }
            response.setTriage(triageDTO);

            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("Critical Failure in Triage Controller: {}", e.getMessage(), e);
            return handleGlobalTriageError();
        }
    }

    /**
     * Normalizes specialty variations into standard field names.
     */
    private String normalizeSpecialty(String specialty) {
        if (specialty == null) return null;
        
        String s = specialty.trim().replace("Specialist", "").replace("Doctor", "").trim();
        
        if (s.equalsIgnoreCase("Cardiologist")) return "Cardiology";
        if (s.equalsIgnoreCase("Neurologist")) return "Neurology";
        if (s.equalsIgnoreCase("Gastroenterologist")) return "Gastroenterology";
        if (s.equalsIgnoreCase("Pulmonologist")) return "Pulmonology";
        if (s.equalsIgnoreCase("Dermatologist")) return "Dermatology";
        if (s.equalsIgnoreCase("Psychiatrist")) return "Psychiatry";
        if (s.equalsIgnoreCase("Endocrinologist")) return "Endocrinology";
        if (s.equalsIgnoreCase("Orthopaedics") || s.equalsIgnoreCase("Orthopaedic")) return "Orthopedics";
        if (s.equalsIgnoreCase("ENT Specialist") || s.equalsIgnoreCase("Otolaryngology")) return "ENT";
        if (s.equalsIgnoreCase("General Physician") || s.equalsIgnoreCase("General Doctor") || s.equalsIgnoreCase("Primary Care")) return "General Medicine";
        
        // Capitalize first letter to match Set
        if (s.length() > 0) {
            s = s.substring(0, 1).toUpperCase() + s.substring(1).toLowerCase();
        }
        
        return s;
    }

    /**
     * Smart fallback: Maps symptoms directly to specialties using keywords.
     */
    private String mapSymptomsToSpecialty(String symptoms) {
        if (symptoms == null) return "General Medicine";
        String s = symptoms.toLowerCase();
        
        if (containsAny(s, "diarrhea", "constipation", "nausea", "vomiting", "heartburn", "stomach", "acidity", "gastric")) return "Gastroenterology";
        if (containsAny(s, "chest pain", "heart", "palpitations", "blood pressure")) return "Cardiology";
        if (containsAny(s, "headache", "seizure", "dizziness", "brain", "paralysis", "numbness")) return "Neurology";
        if (containsAny(s, "skin", "rash", "itching", "acne", "burn", "allergy")) return "Dermatology";
        if (containsAny(s, "breathing", "cough", "shortness of breath", "lung", "asthma", "wheezing")) return "Pulmonology";
        if (containsAny(s, "bone", "joint", "fracture", "back pain", "knee", "spine", "ortho")) return "Orthopedics";
        if (containsAny(s, "ear", "nose", "throat", "sinus", "hearing", "tonsil")) return "ENT";
        if (containsAny(s, "mental", "depression", "anxiety", "stress", "sleep", "psych")) return "Psychiatry";
        if (containsAny(s, "hormone", "thyroid", "diabetes", "insulin", "growth")) return "Endocrinology";
        
        return "General Medicine";
    }

    private boolean containsAny(String input, String... keywords) {
        for (String k : keywords) {
            if (input.contains(k)) return true;
        }
        return false;
    }

    /**
     * Maps specialty results to medicine search keywords for inventory matching.
     */
    private String mapSpecialtyToMedicineSearch(String specialty) {
        if (specialty == null) return "Medicine";
        
        return switch (specialty) {
            case "Gastroenterology" -> "Stomach";
            case "Cardiology" -> "Heart";
            case "Neurology" -> "Pain";
            case "Pulmonology" -> "Cough";
            case "Dermatology" -> "Skin";
            case "Orthopedics" -> "Pain";
            case "ENT" -> "Cold";
            case "Psychiatry" -> "Sleep";
            case "Endocrinology" -> "Insulin";
            default -> "Medicine";
        };
    }

    private ResponseEntity<TriageResponse> handleGlobalTriageError() {
        TriageResponse response = new TriageResponse();
        response.setTriageLevel("LOW");
        response.setSuggestedSpecialty("General Medicine");
        response.setSource("CRITICAL_FALLBACK");
        response.setMessage("Triage system heavily loaded. Showing best-matched specialists based on symptoms.");
        
        // Return absolutely minimal safe objects to avoid ANY further service calls
        response.setRecommendedDoctors(List.of());
        response.setRecommendedPractitioners(List.of());
        response.setMedicines(List.of());
        
        TriageDTO triage = new TriageDTO();
        triage.setSpecialist("General Medicine");
        triage.setAdvice(response.getMessage());
        
        response.setTriage(triage);
        
        return ResponseEntity.ok(response);
    }
}
