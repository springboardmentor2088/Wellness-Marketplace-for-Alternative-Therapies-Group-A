package com.wellness.backend.model;

import com.wellness.backend.enums.SellerVerificationStatus;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "product_seller_profile")
public class ProductSellerProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "organization_name", nullable = false, length = 200)
    private String organizationName;

    @Column(name = "drug_license_number", nullable = false, unique = true, length = 100)
    private String drugLicenseNumber;

    @Column(name = "gmp_certification_url", length = 500)
    private String gmpCertificationUrl;

    @Column(name = "copp_url", length = 500)
    private String coppUrl;

    @Column(name = "smf_url", length = 500)
    private String smfUrl;

    @Column(name = "pharmacist_name", length = 150)
    private String pharmacistName;

    @Column(name = "pharmacist_reg_num", length = 100)
    private String pharmacistRegNum;

    @Column(name = "gst_tax_id", length = 50)
    private String gstTaxId;

    @Column(name = "iec_code", length = 50)
    private String iecCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "verification_status", nullable = false, length = 30)
    private SellerVerificationStatus verificationStatus = SellerVerificationStatus.PENDING_VERIFICATION;

    @Column(name = "verified", nullable = false)
    private Boolean verified = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Getters and Setters
    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public String getOrganizationName() { return organizationName; }
    public void setOrganizationName(String organizationName) { this.organizationName = organizationName; }
    public String getDrugLicenseNumber() { return drugLicenseNumber; }
    public void setDrugLicenseNumber(String drugLicenseNumber) { this.drugLicenseNumber = drugLicenseNumber; }
    public String getGmpCertificationUrl() { return gmpCertificationUrl; }
    public void setGmpCertificationUrl(String gmpCertificationUrl) { this.gmpCertificationUrl = gmpCertificationUrl; }
    public String getCoppUrl() { return coppUrl; }
    public void setCoppUrl(String coppUrl) { this.coppUrl = coppUrl; }
    public String getSmfUrl() { return smfUrl; }
    public void setSmfUrl(String smfUrl) { this.smfUrl = smfUrl; }
    public String getPharmacistName() { return pharmacistName; }
    public void setPharmacistName(String pharmacistName) { this.pharmacistName = pharmacistName; }
    public String getPharmacistRegNum() { return pharmacistRegNum; }
    public void setPharmacistRegNum(String pharmacistRegNum) { this.pharmacistRegNum = pharmacistRegNum; }
    public String getGstTaxId() { return gstTaxId; }
    public void setGstTaxId(String gstTaxId) { this.gstTaxId = gstTaxId; }
    public String getIecCode() { return iecCode; }
    public void setIecCode(String iecCode) { this.iecCode = iecCode; }
    public SellerVerificationStatus getVerificationStatus() { return verificationStatus; }
    public void setVerificationStatus(SellerVerificationStatus verificationStatus) { this.verificationStatus = verificationStatus; }
    public Boolean getVerified() { return verified; }
    public void setVerified(Boolean verified) { this.verified = verified; }
}
