package com.wellness.backend.dto;

import java.util.List;

public class PractitionerResponse {

    private TriageDTO triage;
    private List<PractitionerProfileDTO> recommendedPractitioners;

    public PractitionerResponse() {}

    public PractitionerResponse(TriageDTO triage, List<PractitionerProfileDTO> recommendedPractitioners) {
        this.triage = triage;
        this.recommendedPractitioners = recommendedPractitioners;
    }

    // Static helper for emergency bypassing
    public static PractitionerResponse emergency(TriageDTO triage) {
        return new PractitionerResponse(triage, null);
    }

    public TriageDTO getTriage() {
        return triage;
    }

    public void setTriage(TriageDTO triage) {
        this.triage = triage;
    }

    public List<PractitionerProfileDTO> getRecommendedPractitioners() {
        return recommendedPractitioners;
    }

    public void setRecommendedPractitioners(List<PractitionerProfileDTO> recommendedPractitioners) {
        this.recommendedPractitioners = recommendedPractitioners;
    }
}
