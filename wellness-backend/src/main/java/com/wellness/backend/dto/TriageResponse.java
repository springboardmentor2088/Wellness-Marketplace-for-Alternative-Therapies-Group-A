package com.wellness.backend.dto;

import java.util.List;

public class TriageResponse {
    private String triageLevel;
    private String source;
    private String message;
    private String suggestedSpecialty; // Added to decouple urgency from specialty
    private List<PractitionerProfileDTO> recommendedDoctors;
    private List<PractitionerProfileDTO> recommendedPractitioners; // Alias for frontend
    private List<ProductDTO> medicines;
    private TriageDTO triage; // Nested AI analysis object

    public TriageResponse() {}

    public TriageResponse(String triageLevel, String source, String message, List<PractitionerProfileDTO> recommendedDoctors, List<ProductDTO> medicines) {
        this.triageLevel = triageLevel;
        this.source = source;
        this.message = message;
        this.recommendedDoctors = recommendedDoctors;
        this.recommendedPractitioners = recommendedDoctors;
        this.medicines = medicines;
    }

    public String getTriageLevel() { return triageLevel; }
    public void setTriageLevel(String triageLevel) { this.triageLevel = triageLevel; }
    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public String getSuggestedSpecialty() { return suggestedSpecialty; }
    public void setSuggestedSpecialty(String suggestedSpecialty) { this.suggestedSpecialty = suggestedSpecialty; }
    public List<PractitionerProfileDTO> getRecommendedDoctors() { return recommendedDoctors; }
    public void setRecommendedDoctors(List<PractitionerProfileDTO> recommendedDoctors) { 
        this.recommendedDoctors = recommendedDoctors; 
        this.recommendedPractitioners = recommendedDoctors;
    }
    public List<PractitionerProfileDTO> getRecommendedPractitioners() { return recommendedPractitioners; }
    public void setRecommendedPractitioners(List<PractitionerProfileDTO> recommendedPractitioners) { 
        this.recommendedPractitioners = recommendedPractitioners; 
        this.recommendedDoctors = recommendedPractitioners;
    }
    public List<ProductDTO> getMedicines() { return medicines; }
    public void setMedicines(List<ProductDTO> medicines) { this.medicines = medicines; }
    public TriageDTO getTriage() { return triage; }
    public void setTriage(TriageDTO triage) { this.triage = triage; }
}
