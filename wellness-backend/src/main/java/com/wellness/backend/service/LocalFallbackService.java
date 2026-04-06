package com.wellness.backend.service;

import com.wellness.backend.dto.TriageResult;
import com.wellness.backend.dto.TriageDTO;
import org.springframework.stereotype.Service;
import java.util.Map;
import java.util.List;

@Service
public class LocalFallbackService {
    // A simple map for keyword-based triage when AI is offline
    private static final List<String> EMERGENCY_KEYWORDS = List.of("breath", "chest pain", "unconscious", "bleeding");

    private static final Map<String, String> KEYWORD_MAP = Map.ofEntries(
        Map.entry("chest", "Cardiology"),
        Map.entry("heart", "Cardiology"),
        Map.entry("stomach", "Gastroenterology"),
        Map.entry("digestion", "Gastroenterology"),
        Map.entry("headache", "Neurology"),
        Map.entry("seizure", "Neurology"),
        Map.entry("skin", "Dermatology"),
        Map.entry("bone", "Orthopedics"),
        Map.entry("joint", "Orthopedics"),
        Map.entry("ear", "ENT"),
        Map.entry("ringing", "ENT")
    );

    public TriageResult getLocalTriage(String symptoms) {
        if (symptoms == null) {
            return new TriageResult("LOW", "Symptoms not provided.", false, "LOCAL_FALLBACK", "Primary Care", null);
        }
        
        String input = symptoms.toLowerCase();
        boolean isEmergency = EMERGENCY_KEYWORDS.stream().anyMatch(input::contains);
        String specialty = "Primary Care"; // Default

        for (Map.Entry<String, String> entry : KEYWORD_MAP.entrySet()) {
            if (input.contains(entry.getKey())) {
                specialty = entry.getValue();
                break;
            }
        }

        String urgency = isEmergency ? "EMERGENCY" : "MEDIUM";
        String message = isEmergency 
            ? "EMERGENCY DETECTED. Please seek immediate medical attention. AI is offline, but symptoms match emergency criteria."
            : "AI is currently offline. Based on symptoms, we recommend " + specialty;

        // Build a basic TriageDTO for frontend consistency
        TriageDTO dto = new TriageDTO();
        dto.setAdvice(message);
        dto.setSpecialist(specialty);
        dto.setHomeRemedies(List.of("Rest", "Hydration"));

        return new TriageResult(
            urgency, 
            message, 
            false, // isAiGenerated = false
            "LOCAL_FALLBACK", 
            specialty, 
            dto
        );
    }
}
