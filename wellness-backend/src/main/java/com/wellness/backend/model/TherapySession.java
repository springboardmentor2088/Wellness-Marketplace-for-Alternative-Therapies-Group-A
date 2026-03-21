package com.wellness.backend.model;

import com.wellness.backend.enums.PaymentStatus;
import com.wellness.backend.enums.SessionStatus;
import com.wellness.backend.enums.SessionType;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "therapy_session", indexes = {
        @Index(name = "idx_start_time", columnList = "startTime"),
        @Index(name = "idx_status", columnList = "status"),
        @Index(name = "idx_reminder_sent", columnList = "reminderSent"),
        @Index(name = "idx_user_id", columnList = "user_id"),
        @Index(name = "idx_practitioner_id", columnList = "practitioner_id")
})
public class TherapySession {

    public enum CancelledBy {
        USER, PRACTITIONER, ADMIN
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "practitioner_id", nullable = false)
    private PractitionerProfile practitioner;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private LocalDate sessionDate;

    @Column(nullable = false)
    private LocalTime startTime;

    @Column(nullable = false)
    private LocalTime endTime;

    @Column(nullable = false)
    private Integer duration; // in minutes

    @Column(nullable = false, precision = 10, scale = 2)
    private java.math.BigDecimal feeAmount = java.math.BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SessionType sessionType = SessionType.ONLINE;

    private String meetingLink;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SessionStatus status = SessionStatus.BOOKED;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentStatus paymentStatus = PaymentStatus.PENDING;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(columnDefinition = "TEXT")
    private String cancellationReason;

    @Enumerated(EnumType.STRING)
    private CancelledBy cancelledBy;

    @Column(nullable = false, columnDefinition = "BOOLEAN DEFAULT FALSE")
    private Boolean reminderSent = false;

    @Column(nullable = false, columnDefinition = "BOOLEAN DEFAULT FALSE")
    private Boolean oneHourReminderSent = false;

    @Column(length = 1000)
    private String prescribedDocumentUrl;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // Getters and Setters
    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public PractitionerProfile getPractitioner() {
        return practitioner;
    }

    public void setPractitioner(PractitionerProfile practitioner) {
        this.practitioner = practitioner;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public LocalDate getSessionDate() {
        return sessionDate;
    }

    public void setSessionDate(LocalDate sessionDate) {
        this.sessionDate = sessionDate;
    }

    public LocalTime getStartTime() {
        return startTime;
    }

    public void setStartTime(LocalTime startTime) {
        this.startTime = startTime;
    }

    public LocalTime getEndTime() {
        return endTime;
    }

    public void setEndTime(LocalTime endTime) {
        this.endTime = endTime;
    }

    public Integer getDuration() {
        return duration;
    }

    public void setDuration(Integer duration) {
        this.duration = duration;
    }

    public java.math.BigDecimal getFeeAmount() {
        return feeAmount;
    }

    public void setFeeAmount(java.math.BigDecimal feeAmount) {
        this.feeAmount = feeAmount;
    }

    public SessionType getSessionType() {
        return sessionType;
    }

    public void setSessionType(SessionType sessionType) {
        this.sessionType = sessionType;
    }

    public String getMeetingLink() {
        return meetingLink;
    }

    public void setMeetingLink(String meetingLink) {
        this.meetingLink = meetingLink;
    }

    public SessionStatus getStatus() {
        return status;
    }

    public void setStatus(SessionStatus status) {
        this.status = status;
    }

    public PaymentStatus getPaymentStatus() {
        return paymentStatus;
    }

    public void setPaymentStatus(PaymentStatus paymentStatus) {
        this.paymentStatus = paymentStatus;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public String getCancellationReason() {
        return cancellationReason;
    }

    public void setCancellationReason(String cancellationReason) {
        this.cancellationReason = cancellationReason;
    }

    public CancelledBy getCancelledBy() {
        return cancelledBy;
    }

    public void setCancelledBy(CancelledBy cancelledBy) {
        this.cancelledBy = cancelledBy;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public Boolean getReminderSent() {
        return reminderSent;
    }

    public void setReminderSent(Boolean reminderSent) {
        this.reminderSent = reminderSent;
    }

    public Boolean getOneHourReminderSent() {
        return oneHourReminderSent;
    }

    public void setOneHourReminderSent(Boolean oneHourReminderSent) {
        this.oneHourReminderSent = oneHourReminderSent;
    }

    public String getPrescribedDocumentUrl() {
        return prescribedDocumentUrl;
    }

    public void setPrescribedDocumentUrl(String prescribedDocumentUrl) {
        this.prescribedDocumentUrl = prescribedDocumentUrl;
    }

    // Aliases for service compatibility
    public String getPrescriptionPath() {
        return prescribedDocumentUrl;
    }

    public void setPrescriptionPath(String prescriptionPath) {
        this.prescribedDocumentUrl = prescriptionPath;
    }
}
