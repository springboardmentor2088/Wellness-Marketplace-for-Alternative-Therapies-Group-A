package com.wellness.backend.dto;

import java.time.LocalDateTime;

public class ReviewDTO {

    private Integer id;
    private Integer userId;
    private String userName;
    private Integer practitionerId;
    private String practitionerName;
    private Integer sessionId;
    private Integer rating;
    private Integer behaviourRating;
    private Integer treatmentEffectivenessRating;
    private Boolean recommendPractitioner;
    private String comment;
    private LocalDateTime createdAt;

    // Getters and Setters
    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public Integer getUserId() {
        return userId;
    }

    public void setUserId(Integer userId) {
        this.userId = userId;
    }

    public String getUserName() {
        return userName;
    }

    public void setUserName(String userName) {
        this.userName = userName;
    }

    public Integer getPractitionerId() {
        return practitionerId;
    }

    public void setPractitionerId(Integer practitionerId) {
        this.practitionerId = practitionerId;
    }

    public String getPractitionerName() {
        return practitionerName;
    }

    public void setPractitionerName(String practitionerName) {
        this.practitionerName = practitionerName;
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

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
