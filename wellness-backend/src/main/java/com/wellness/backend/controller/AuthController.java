package com.wellness.backend.controller;

import com.wellness.backend.dto.AuthResponseDTO;
import com.wellness.backend.dto.ResendOtpDTO;
import com.wellness.backend.dto.UserLoginDTO;
import com.wellness.backend.dto.UserRegisterDTO;
import com.wellness.backend.dto.ForgotPasswordDTO;
import com.wellness.backend.dto.ResetPasswordDTO;
import com.wellness.backend.dto.VerifyEmailDTO;
import com.wellness.backend.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.wellness.backend.dto.MessageResponseDTO;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    @Autowired
    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    // ================= REGISTER NEW USER =================
    @PostMapping("/register")
    public ResponseEntity<MessageResponseDTO> registerUser(
            @Valid @RequestBody UserRegisterDTO registerDTO) {

        MessageResponseDTO response = authService.registerUser(registerDTO);
        return ResponseEntity.ok(response);
    }

    // ================= VERIFY EMAIL OTP =================
    @PostMapping("/verify-email")
    public ResponseEntity<AuthResponseDTO> verifyEmail(
            @Valid @RequestBody VerifyEmailDTO dto) {

        AuthResponseDTO response = authService.verifyEmail(dto);
        return ResponseEntity.ok(response);
    }

    // ================= RESEND OTP =================
    @PostMapping("/resend-otp")
    public ResponseEntity<MessageResponseDTO> resendOtp(
            @Valid @RequestBody ResendOtpDTO dto) {

        MessageResponseDTO response = authService.resendOtp(dto.getEmail());
        return ResponseEntity.ok(response);
    }

    // ================= LOGIN EXISTING USER =================
    @PostMapping("/login")
    public ResponseEntity<AuthResponseDTO> loginUser(
            @Valid @RequestBody UserLoginDTO loginDTO) {

        AuthResponseDTO response = authService.loginUser(loginDTO);
        return ResponseEntity.ok(response);
    }

    // ================= REFRESH ACCESS TOKEN =================
    @PostMapping("/refresh")
    public ResponseEntity<AuthResponseDTO> refreshToken(
            @RequestParam String refreshToken) {

        AuthResponseDTO response = authService.refreshToken(refreshToken);
        return ResponseEntity.ok(response);
    }

    // ================= REQUEST PASSWORD RESET =================
    /**
     * Initiates password reset flow.
     * Returns generic success message (does NOT reveal if email exists).
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<MessageResponseDTO> forgotPassword(
            @Valid @RequestBody ForgotPasswordDTO dto) {

        authService.requestPasswordReset(dto.getEmail());
        return ResponseEntity.ok(
                new MessageResponseDTO("If an account with this email exists, a password reset link has been sent."));
    }

    // ================= RESET PASSWORD =================
    /**
     * Completes password reset with secure token.
     */
    @PostMapping("/reset-password")
    public ResponseEntity<MessageResponseDTO> resetPassword(
            @Valid @RequestBody ResetPasswordDTO dto) {

        authService.resetPassword(dto.getToken(), dto.getNewPassword());
        return ResponseEntity.ok(
                new MessageResponseDTO("Password has been reset successfully. Please log in with your new password."));
    }
}