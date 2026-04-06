package com.wellness.backend.dto;

public class TriageResult {
    private String triageLevel;
    private String message;
    private boolean success;
    private String source;
    private String suggestedSpecialty; // Added to store doctor type (e.g. Gastroenterologist)
    private TriageDTO triageDTO; // Added to store full AI analysis

    public TriageResult() {}

    public TriageResult(String triageLevel, String message, boolean success, String source) {
        this(triageLevel, message, success, source, null, null);
    }

    public TriageResult(String triageLevel, String message, boolean success, String source, String suggestedSpecialty, TriageDTO triageDTO) {
        this.triageLevel = triageLevel;
        this.message = message;
        this.success = success;
        this.source = source;
        this.suggestedSpecialty = suggestedSpecialty;
        this.triageDTO = triageDTO;
    }

    public String getTriageLevel() { return triageLevel; }
    public void setTriageLevel(String triageLevel) { this.triageLevel = triageLevel; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }
    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
    public String getSuggestedSpecialty() { return suggestedSpecialty; }
    public void setSuggestedSpecialty(String suggestedSpecialty) { this.suggestedSpecialty = suggestedSpecialty; }
    public TriageDTO getTriageDTO() { return triageDTO; }
    public void setTriageDTO(TriageDTO triageDTO) { this.triageDTO = triageDTO; }
}
