package com.wellness.backend.dto.forum;

import jakarta.validation.constraints.NotBlank;

public class CreateReportDTO {
    @NotBlank(message = "Reason is required")
    private String reason;

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
}
