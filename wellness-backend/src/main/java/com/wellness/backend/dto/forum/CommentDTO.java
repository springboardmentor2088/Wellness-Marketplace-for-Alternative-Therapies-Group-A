package com.wellness.backend.dto.forum;

import java.time.LocalDateTime;

public class CommentDTO {
    private Integer id;
    private Integer answerId;
    private String content;
    private String authorName;
    private Integer authorId;
    private String authorRole;
    private LocalDateTime createdAt;

    // Getters and setters
    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public Integer getAnswerId() { return answerId; }
    public void setAnswerId(Integer answerId) { this.answerId = answerId; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public String getAuthorName() { return authorName; }
    public void setAuthorName(String authorName) { this.authorName = authorName; }
    public Integer getAuthorId() { return authorId; }
    public void setAuthorId(Integer authorId) { this.authorId = authorId; }
    public String getAuthorRole() { return authorRole; }
    public void setAuthorRole(String authorRole) { this.authorRole = authorRole; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
