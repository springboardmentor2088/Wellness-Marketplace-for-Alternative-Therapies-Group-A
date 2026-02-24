package com.wellness.backend.dto;

import com.wellness.backend.model.TherapySession;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

public class TherapySessionDTO {
    private Integer id;
    private Integer practitionerId;
    private String practitionerName;
    private Integer userId;
    private String userName;
    private LocalDate sessionDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private Integer duration;
    private TherapySession.SessionType sessionType;
    private String meetingLink;
    private TherapySession.Status status;
    private TherapySession.PaymentStatus paymentStatus;
    private String notes;
    private String cancellationReason;
    private TherapySession.CancelledBy cancelledBy;
    private LocalDateTime createdAt;

    // Getters and Setters
    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
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

    public TherapySession.SessionType getSessionType() {
        return sessionType;
    }

    public void setSessionType(TherapySession.SessionType sessionType) {
        this.sessionType = sessionType;
    }

    public String getMeetingLink() {
        return meetingLink;
    }

    public void setMeetingLink(String meetingLink) {
        this.meetingLink = meetingLink;
    }

    public TherapySession.Status getStatus() {
        return status;
    }

    public void setStatus(TherapySession.Status status) {
        this.status = status;
    }

    public TherapySession.PaymentStatus getPaymentStatus() {
        return paymentStatus;
    }

    public void setPaymentStatus(TherapySession.PaymentStatus paymentStatus) {
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

    public TherapySession.CancelledBy getCancelledBy() {
        return cancelledBy;
    }

    public void setCancelledBy(TherapySession.CancelledBy cancelledBy) {
        this.cancelledBy = cancelledBy;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
