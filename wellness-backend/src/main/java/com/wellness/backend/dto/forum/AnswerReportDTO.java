package com.wellness.backend.dto.forum;

import java.time.LocalDateTime;

public class AnswerReportDTO {
    private Integer id;
    private Integer answerId;
    private Integer threadId;
    private String answerContent;
    private String answerAuthorName;
    private String reporterName;
    private String reason;
    private LocalDateTime createdAt;
    private boolean resolved;
    private LocalDateTime resolvedAt;
    private String resolvedBy;

    // Getters and Setters
    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public Integer getAnswerId() { return answerId; }
    public void setAnswerId(Integer answerId) { this.answerId = answerId; }
    public Integer getThreadId() { return threadId; }
    public void setThreadId(Integer threadId) { this.threadId = threadId; }
    public String getAnswerContent() { return answerContent; }
    public void setAnswerContent(String answerContent) { this.answerContent = answerContent; }
    public String getAnswerAuthorName() { return answerAuthorName; }
    public void setAnswerAuthorName(String answerAuthorName) { this.answerAuthorName = answerAuthorName; }
    public String getReporterName() { return reporterName; }
    public void setReporterName(String reporterName) { this.reporterName = reporterName; }
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public boolean isResolved() { return resolved; }
    public void setResolved(boolean resolved) { this.resolved = resolved; }
    public LocalDateTime getResolvedAt() { return resolvedAt; }
    public void setResolvedAt(LocalDateTime resolvedAt) { this.resolvedAt = resolvedAt; }
    public String getResolvedBy() { return resolvedBy; }
    public void setResolvedBy(String resolvedBy) { this.resolvedBy = resolvedBy; }
}
