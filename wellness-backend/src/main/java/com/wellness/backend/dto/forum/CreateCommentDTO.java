package com.wellness.backend.dto.forum;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class CreateCommentDTO {
    
    @NotBlank(message = "Content is required")
    @Size(min = 2, max = 1000, message = "Content must be between 2 and 1000 characters")
    private String content;

    // Getters and Setters
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
}
