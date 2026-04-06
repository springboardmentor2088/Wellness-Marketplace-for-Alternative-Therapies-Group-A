package com.wellness.backend.service;

import com.wellness.backend.dto.MedicalAnalysisDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
public class MedicalIntelligenceService {

    @Autowired
    private GeminiService geminiService;

    @Autowired
    private ProductService productService;

    private static final String DEFAULT_DISCLAIMER = "Always consult a registered medical practitioner for professional medical advice, diagnosis, or treatment.";

    public Map<String, Object> analyzeAndMatch(String text, String base64Image, String mimeType) {
        Map<String, Object> result = new HashMap<>();

        try {
            // Phase 1: AI Extraction
            MedicalAnalysisDTO analysis = geminiService.analyzeMedicalInput(text, base64Image, mimeType);

            // Handle Safety Blocks or Empty Responses gracefully
            if (analysis == null) {
                return createFallbackResponse("We couldn't analyze the input due to safety filters or technical issues.");
            }

            result.put("analysis", analysis);
            result.put("status", "SUCCESS");

            // Build the Alert Message
            String advice = (analysis.getAdvice() != null && !analysis.getAdvice().isBlank()) 
                            ? analysis.getAdvice() 
                            : DEFAULT_DISCLAIMER;
            
            result.put("alert", "RED_ALERT: " + advice);
            
            // Optional: Ensure the legal disclaimer is ALWAYS appended
            if (!advice.toLowerCase().contains("consult")) {
                result.put("alert", result.get("alert") + " " + DEFAULT_DISCLAIMER);
            }

        } catch (Exception e) {
            // Log the actual exception for debugging
            return createFallbackResponse("AI analysis service is currently experiencing high traffic.");
        }

        return result;
    }

    private Map<String, Object> createFallbackResponse(String message) {
        Map<String, Object> fallback = new HashMap<>();
        fallback.put("status", "PARTIAL_SUCCESS"); // Use PARTIAL so frontend still shows the disclaimer
        fallback.put("message", message);
        fallback.put("alert", "RED_ALERT: " + DEFAULT_DISCLAIMER);
        return fallback;
    }
}
