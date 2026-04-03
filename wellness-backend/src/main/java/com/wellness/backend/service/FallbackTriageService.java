package com.wellness.backend.service;

import com.wellness.backend.dto.TriageResult;
import org.springframework.stereotype.Service;

import java.util.regex.Pattern;

@Service
public class FallbackTriageService {

    public TriageResult analyzeSymptoms(String symptoms) {
        if (symptoms == null || symptoms.isEmpty()) {
            return new TriageResult("LOW", "Please provide symptoms for accurate triage.", true, "FALLBACK", "General Physician", null);
        }

        String input = symptoms.toLowerCase();
        String specialty = "General Medicine";
        String urgency = "LOW";
        String advice = "Your symptoms appear mild. Rest, hydrate, and consult General Medicine if needed.";

        // 1. EMERGENCY / CARDIOLOGY / PULMONOLOGY
        if (containsAny(input, "chest pain", "heart attack", "palpitations")) {
            urgency = "HIGH";
            specialty = "Cardiology";
            advice = "CRITICAL: Potential cardiac issue. Please seek immediate medical attention.";
        } else if (containsAny(input, "breathing difficulty", "shortness of breath", "wheezing")) {
            urgency = "HIGH";
            specialty = "Pulmonology";
            advice = "URGENT: Respiratory distress. Consult Pulmonology or emergency services.";
        }
        
        // 2. GASTROENTEROLOGY (Strict Rule)
        else if (containsAny(input, "diarrhea", "constipation", "nausea", "vomiting", "acidity", "stomach pain", "heartburn")) {
            urgency = "MEDIUM";
            specialty = "Gastroenterology";
            advice = "STABLE: Digestive symptoms detected. A consultation with Gastroenterology is recommended.";
        }

        // 3. NEUROLOGY
        else if (containsAny(input, "headache", "dizziness", "seizures", "numbness")) {
            urgency = "MEDIUM";
            specialty = "Neurology";
            advice = "STABLE: Neurological symptoms. Consider scheduling a visit with Neurology.";
        }

        // 4. DERMATOLOGY
        else if (containsAny(input, "rash", "itching", "skin", "burn")) {
            urgency = "LOW";
            specialty = "Dermatology";
            advice = "LOW: Skin concerns. Dermatology can help evaluate this.";
        }

        return new TriageResult(urgency, advice, true, "FALLBACK", specialty, null);
    }

    private boolean containsAny(String input, String... keywords) {
        for (String keyword : keywords) {
            if (Pattern.compile("\\b" + Pattern.quote(keyword) + "\\b").matcher(input).find()) {
                return true;
            }
        }
        return false;
    }
}
