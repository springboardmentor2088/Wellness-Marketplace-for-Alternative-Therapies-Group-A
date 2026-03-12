package com.wellness.backend.dto;

public class OnboardingStatusDTO {
    private boolean profileExists;
    private boolean isVerified;
    private boolean onboardingCompleted;

    // Constructors
    public OnboardingStatusDTO() {
    }

    public OnboardingStatusDTO(boolean profileExists, boolean isVerified) {
        this.profileExists = profileExists;
        this.isVerified = isVerified;
        this.onboardingCompleted = false;
    }

    public OnboardingStatusDTO(boolean profileExists, boolean isVerified, boolean onboardingCompleted) {
        this.profileExists = profileExists;
        this.isVerified = isVerified;
        this.onboardingCompleted = onboardingCompleted;
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

    public boolean isOnboardingCompleted() {
        return onboardingCompleted;
    }

    public void setOnboardingCompleted(boolean onboardingCompleted) {
        this.onboardingCompleted = onboardingCompleted;
    }
}
