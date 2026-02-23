package com.wellness.backend.dto;

public class MessageResponseDTO {

    private String message;

    // =============== CONSTRUCTORS ===============
    public MessageResponseDTO() {}

    public MessageResponseDTO(String message) {
        this.message = message;
    }

    // =============== GETTERS & SETTERS ===============
    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
