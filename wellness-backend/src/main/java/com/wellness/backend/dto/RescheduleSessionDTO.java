package com.wellness.backend.dto;

import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.time.LocalTime;

public class RescheduleSessionDTO {

    @NotNull(message = "New session date is required")
    @FutureOrPresent(message = "New date must be today or in the future")
    private LocalDate newSessionDate;

    @NotNull(message = "New start time is required")
    private LocalTime newStartTime;

    private String reason;

    // Getters and Setters
    public LocalDate getNewSessionDate() {
        return newSessionDate;
    }

    public void setNewSessionDate(LocalDate newSessionDate) {
        this.newSessionDate = newSessionDate;
    }

    public LocalTime getNewStartTime() {
        return newStartTime;
    }

    public void setNewStartTime(LocalTime newStartTime) {
        this.newStartTime = newStartTime;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }
}
