package com.wellness.backend.dto;

import jakarta.validation.constraints.NotBlank;

public class SellerApplicationDTO {
    @NotBlank(message = "Organization name is required")
    private String organizationName;

    @NotBlank(message = "Drug license number is required")
    private String drugLicenseNumber;

    private String pharmacistName;
    private String pharmacistRegNum;
    private String gstTaxId;
    private String iecCode;

    // Getters and Setters
    public String getOrganizationName() { return organizationName; }
    public void setOrganizationName(String organizationName) { this.organizationName = organizationName; }
    public String getDrugLicenseNumber() { return drugLicenseNumber; }
    public void setDrugLicenseNumber(String drugLicenseNumber) { this.drugLicenseNumber = drugLicenseNumber; }
    public String getPharmacistName() { return pharmacistName; }
    public void setPharmacistName(String pharmacistName) { this.pharmacistName = pharmacistName; }
    public String getPharmacistRegNum() { return pharmacistRegNum; }
    public void setPharmacistRegNum(String pharmacistRegNum) { this.pharmacistRegNum = pharmacistRegNum; }
    public String getGstTaxId() { return gstTaxId; }
    public void setGstTaxId(String gstTaxId) { this.gstTaxId = gstTaxId; }
    public String getIecCode() { return iecCode; }
    public void setIecCode(String iecCode) { this.iecCode = iecCode; }
}
