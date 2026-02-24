package com.wellness.backend.dto;

public class OnboardingStatusDTO {
    private boolean profileExists;
    private boolean isVerified;

    // Constructors
    public OnboardingStatusDTO() {
    }

    public OnboardingStatusDTO(boolean profileExists, boolean isVerified) {
        this.profileExists = profileExists;
        this.isVerified = isVerified;
    }

    // Getters and Setters
    public boolean isProfileExists() {
        return profileExists;
    }

    public void setProfileExists(boolean profileExists) {
        this.profileExists = profileExists;
    }

    public boolean isVerified() {
        return isVerified;
    }

    public void setVerified(boolean verified) {
        isVerified = verified;
    }
}
