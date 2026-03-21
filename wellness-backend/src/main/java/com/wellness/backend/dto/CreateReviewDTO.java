package com.wellness.backend.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public class CreateReviewDTO {

    @NotNull(message = "Practitioner ID is required")
    private Integer practitionerId;

    private Integer sessionId;

    @NotNull(message = "Rating is required")
    @Min(value = 1, message = "Rating must be at least 1")
    @Max(value = 5, message = "Rating must be at most 5")
    private Integer rating;

    @Min(value = 1, message = "Behaviour rating must be at least 1")
    @Max(value = 5, message = "Behaviour rating must be at most 5")
    private Integer behaviourRating;

    @Min(value = 1, message = "Treatment effectiveness rating must be at least 1")
    @Max(value = 5, message = "Treatment effectiveness rating must be at most 5")
    private Integer treatmentEffectivenessRating;

    private Boolean recommendPractitioner;

    private String comment;

    // Getters and Setters
    public Integer getPractitionerId() {
        return practitionerId;
    }

    public void setPractitionerId(Integer practitionerId) {
        this.practitionerId = practitionerId;
    }

    public Integer getSessionId() {
        return sessionId;
    }

    public void setSessionId(Integer sessionId) {
        this.sessionId = sessionId;
    }

    public Integer getRating() {
        return rating;
    }

    public void setRating(Integer rating) {
        this.rating = rating;
    }

    public Integer getBehaviourRating() {
        return behaviourRating;
    }

    public void setBehaviourRating(Integer behaviourRating) {
        this.behaviourRating = behaviourRating;
    }

    public Integer getTreatmentEffectivenessRating() {
        return treatmentEffectivenessRating;
    }

    public void setTreatmentEffectivenessRating(Integer treatmentEffectivenessRating) {
        this.treatmentEffectivenessRating = treatmentEffectivenessRating;
    }

    public Boolean getRecommendPractitioner() {
        return recommendPractitioner;
    }

    public void setRecommendPractitioner(Boolean recommendPractitioner) {
        this.recommendPractitioner = recommendPractitioner;
    }

    public String getComment() {
        return comment;
    }

    public void setComment(String comment) {
        this.comment = comment;
    }
}
