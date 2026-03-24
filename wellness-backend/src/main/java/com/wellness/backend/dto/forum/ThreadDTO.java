package com.wellness.backend.dto.forum;

import java.time.LocalDateTime;
import java.util.List;

public class ThreadDTO {
    private Integer id;
    private String title;
    private String content;
    private String category;
    private String authorName;
    private Integer authorId;
    private String authorRole;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private boolean isDeleted;
    private List<AnswerDTO> answers;
    private Integer answersCount = 0;


    // Getters and setters
    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getAuthorName() { return authorName; }
    public void setAuthorName(String authorName) { this.authorName = authorName; }
    public Integer getAuthorId() { return authorId; }
    public void setAuthorId(Integer authorId) { this.authorId = authorId; }
    public String getAuthorRole() { return authorRole; }
    public void setAuthorRole(String authorRole) { this.authorRole = authorRole; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
    public List<AnswerDTO> getAnswers() { return answers; }
    public void setAnswers(List<AnswerDTO> answers) { this.answers = answers; }

    public boolean isDeleted() { return isDeleted; }
    public void setDeleted(boolean isDeleted) { this.isDeleted = isDeleted; }

    public Integer getAnswersCount() { return answersCount; }
    public void setAnswersCount(Integer answersCount) { this.answersCount = answersCount; }
}
