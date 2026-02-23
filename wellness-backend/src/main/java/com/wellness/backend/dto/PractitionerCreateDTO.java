package com.wellness.backend.dto;

import jakarta.validation.constraints.NotBlank;

public class PractitionerCreateDTO {
    
    @NotBlank(message = "Specialization is required")
    private String specialization;
    
    private String qualifications;
    private String experience;
    private String bio;

    // Getters and Setters
    public String getSpecialization() {
        return specialization;
    }

    public void setSpecialization(String specialization) {
        this.specialization = specialization;
    }

    public String getQualifications() {
        return qualifications;
    }

    public void setQualifications(String qualifications) {
        this.qualifications = qualifications;
    }

    public String getExperience() {
        return experience;
    }

    public void setExperience(String experience) {
        this.experience = experience;
    }

    public String getBio() {
        return bio;
    }

    public void setBio(String bio) {
        this.bio = bio;
    }
}
