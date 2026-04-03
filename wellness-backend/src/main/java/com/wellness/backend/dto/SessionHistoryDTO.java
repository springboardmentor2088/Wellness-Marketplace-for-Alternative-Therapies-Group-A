package com.wellness.backend.dto;

import java.time.LocalDate;
import java.time.LocalTime;

public class SessionHistoryDTO {
    private Integer sessionId;
    private String patientName;
    private LocalDate date;
    private LocalTime time;
    private String documentUrl;
    private String type; // e.g., "PRESCRIPTION" or "PATIENT_LOG"

    public SessionHistoryDTO() {}

    public SessionHistoryDTO(Integer sessionId, String patientName, LocalDate date, LocalTime time, String documentUrl, String type) {
        this.sessionId = sessionId;
        this.patientName = patientName;
        this.date = date;
        this.time = time;
        this.documentUrl = documentUrl;
        this.type = type;
    }

    // Getters and Setters
    public Integer getSessionId() { return sessionId; }
    public void setSessionId(Integer sessionId) { this.sessionId = sessionId; }

    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public LocalTime getTime() { return time; }
    public void setTime(LocalTime time) { this.time = time; }

    public String getDocumentUrl() { return documentUrl; }
    public void setDocumentUrl(String documentUrl) { this.documentUrl = documentUrl; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
}
