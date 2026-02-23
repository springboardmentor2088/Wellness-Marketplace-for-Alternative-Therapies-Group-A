package com.wellness.backend.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * DTO for user login request.
 * Accepts email OR phone number as identifier, plus password.
 */
public class UserLoginDTO {

    @NotBlank(message = "Email or phone number is required")
    private String identifier; // can be email or phone

    @NotBlank(message = "Password is required")
    private String password;

    public String getIdentifier() {
        return identifier;
    }

    public void setIdentifier(String identifier) {
        this.identifier = identifier;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}