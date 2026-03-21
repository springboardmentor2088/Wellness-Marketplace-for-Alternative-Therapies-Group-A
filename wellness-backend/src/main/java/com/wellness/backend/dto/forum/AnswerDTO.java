package com.wellness.backend.dto.forum;

import java.time.LocalDateTime;
import java.util.List;

public class AnswerDTO {
    private Integer id;
    private Integer threadId;
    private String content;
    private String authorName;
    private Integer authorId;
    private String authorRole;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<CommentDTO> comments;
    
    private int likesCount;
    private boolean isAccepted;
    private boolean userHasLiked;
    private Integer authorReputation;
    
    private LocalDateTime acceptedAt;
    private String acceptedBy;
    private double rankingScore;


    // Getters and setters
    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public Integer getThreadId() { return threadId; }
    public void setThreadId(Integer threadId) { this.threadId = threadId; }
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
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
    public List<CommentDTO> getComments() { return comments; }
    public void setComments(List<CommentDTO> comments) { this.comments = comments; }

    public int getLikesCount() { return likesCount; }
    public void setLikesCount(int likesCount) { this.likesCount = likesCount; }
    public boolean isAccepted() { return isAccepted; }
    public void setAccepted(boolean isAccepted) { this.isAccepted = isAccepted; }
    public boolean isUserHasLiked() { return userHasLiked; }
    public void setUserHasLiked(boolean userHasLiked) { this.userHasLiked = userHasLiked; }
    public Integer getAuthorReputation() { return authorReputation; }
    public void setAuthorReputation(Integer authorReputation) { this.authorReputation = authorReputation; }
    public LocalDateTime getAcceptedAt() { return acceptedAt; }
    public void setAcceptedAt(LocalDateTime acceptedAt) { this.acceptedAt = acceptedAt; }
    public String getAcceptedBy() { return acceptedBy; }
    public void setAcceptedBy(String acceptedBy) { this.acceptedBy = acceptedBy; }
    public double getRankingScore() { return rankingScore; }
    public void setRankingScore(double rankingScore) { this.rankingScore = rankingScore; }
}
