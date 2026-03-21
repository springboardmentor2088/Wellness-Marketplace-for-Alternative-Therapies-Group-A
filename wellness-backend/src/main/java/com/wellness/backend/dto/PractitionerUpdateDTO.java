package com.wellness.backend.dto;

public class PractitionerUpdateDTO {
    private String specialization;
    private String qualifications;
    private String experience;
    private java.math.BigDecimal consultationFee;

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

    public java.math.BigDecimal getConsultationFee() {
        return consultationFee;
    }

    public void setConsultationFee(java.math.BigDecimal consultationFee) {
        this.consultationFee = consultationFee;
    }
}
