package com.wellness.backend.service;

import com.wellness.backend.dto.AuthResponseDTO;
import com.wellness.backend.dto.MessageResponseDTO;
import com.wellness.backend.dto.UserLoginDTO;
import com.wellness.backend.dto.UserRegisterDTO;
import com.wellness.backend.dto.VerifyEmailDTO;
import com.wellness.backend.dto.UserDTO;
import com.wellness.backend.model.User;
import com.wellness.backend.model.PractitionerProfile;
import com.wellness.backend.model.PasswordResetToken;
import com.wellness.backend.model.EmailVerificationOtp;
import com.wellness.backend.repository.EmailVerificationOtpRepository;
import com.wellness.backend.repository.PractitionerProfileRepository;
import com.wellness.backend.repository.UserRepository;
import com.wellness.backend.repository.PasswordResetTokenRepository;
import com.wellness.backend.security.JwtService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.UUID;
import java.util.Optional;

/**
 * Service handling all authentication logic:
 * - User registration (with OTP email verification)
 * - OTP verification
 * - OTP resend
 * - User login (blocked if email not verified)
 * - Refresh access token
 * - Password reset
 */
@Service
public class AuthService {

    private static final Logger logger = LoggerFactory.getLogger(AuthService.class);

    private final UserRepository userRepository;
    private final PractitionerProfileRepository practitionerProfileRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final UserService userService;
    private final EmailService emailService;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final EmailVerificationOtpRepository emailVerificationOtpRepository;

    @Autowired
    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder,
            JwtService jwtService, UserService userService,
            EmailService emailService,
            PractitionerProfileRepository practitionerProfileRepository,
            PasswordResetTokenRepository passwordResetTokenRepository,
            EmailVerificationOtpRepository emailVerificationOtpRepository) {
        this.userRepository = userRepository;
        this.practitionerProfileRepository = practitionerProfileRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.userService = userService;
        this.emailService = emailService;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.emailVerificationOtpRepository = emailVerificationOtpRepository;
    }

    // ================= REGISTER NEW USER =================
    @Transactional
    public MessageResponseDTO registerUser(UserRegisterDTO registerDTO) {

        if (userRepository.existsByEmail(registerDTO.getEmail())) {
            throw new RuntimeException("Email is already registered");
        }

        if (registerDTO.getPhone() != null && !registerDTO.getPhone().isBlank()
                && userRepository.existsByPhone(registerDTO.getPhone())) {
            throw new RuntimeException("Phone number is already registered");
        }

        // Map DTO → Entity
        User user = new User();
        user.setName(registerDTO.getName());
        user.setEmail(registerDTO.getEmail());
        user.setPhone(registerDTO.getPhone());
        user.setPassword(passwordEncoder.encode(registerDTO.getPassword()));
        user.setRole(registerDTO.getRole());
        user.setBio(registerDTO.getBio());
        user.setEmailVerified(false);

        // Save user
        User savedUser = userRepository.save(user);

        // Generate 6-digit OTP
        String plainOtp = generateOtp();
        String otpHash = passwordEncoder.encode(plainOtp);

        // Delete any existing OTP for this email
        emailVerificationOtpRepository.deleteByEmail(savedUser.getEmail());

        // Save new OTP record
        EmailVerificationOtp otpRecord = new EmailVerificationOtp();
        otpRecord.setEmail(savedUser.getEmail());
        otpRecord.setOtpHash(otpHash);
        otpRecord.setExpiresAt(LocalDateTime.now().plusMinutes(5));
        otpRecord.setResendAvailableAt(LocalDateTime.now().plusSeconds(60));
        otpRecord.setAttempts(0);
        otpRecord.setMaxAttempts(5);
        emailVerificationOtpRepository.save(otpRecord);

        // Send OTP email (never log the OTP)
        try {
            emailService.sendOtpVerificationEmail(savedUser.getName(), savedUser.getEmail(), plainOtp);
        } catch (Exception e) {
            logger.error("OTP email failed for {}: {}", savedUser.getEmail(), e.getMessage());
        }

        return new MessageResponseDTO("Registration successful. Please verify your email using the OTP sent.");
    }

    // ================= VERIFY EMAIL OTP =================
    @Transactional
    public AuthResponseDTO verifyEmail(VerifyEmailDTO dto) {
        String email = dto.getEmail().trim().toLowerCase();

        EmailVerificationOtp otpRecord = emailVerificationOtpRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("No pending verification found for this email."));

        if (otpRecord.isExpired()) {
            throw new RuntimeException("OTP has expired. Please request a new one.");
        }

        if (otpRecord.isMaxAttemptsReached()) {
            throw new RuntimeException("Maximum verification attempts reached. Please request a new OTP.");
        }

        // Check OTP — if wrong, increment attempts
        if (!passwordEncoder.matches(dto.getOtp(), otpRecord.getOtpHash())) {
            otpRecord.setAttempts(otpRecord.getAttempts() + 1);
            emailVerificationOtpRepository.save(otpRecord);
            int remaining = otpRecord.getMaxAttempts() - otpRecord.getAttempts();
            throw new RuntimeException("Invalid OTP. " + remaining + " attempt(s) remaining.");
        }

        // OTP correct — mark user as verified
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found."));
        user.setEmailVerified(true);
        userRepository.save(user);

        // Delete OTP record
        emailVerificationOtpRepository.deleteByEmail(email);

        // Auto-login: generate JWT tokens so frontend can redirect directly to
        // dashboard
        String accessToken = jwtService.generateToken(user.getEmail(), user.getRole().toString());
        String refreshToken = jwtService.generateRefreshToken(user.getEmail());
        UserDTO userDTO = userService.mapToDTO(user);

        AuthResponseDTO response = new AuthResponseDTO();
        response.setUser(userDTO);
        response.setAccessToken(accessToken);
        response.setRefreshToken(refreshToken);

        logger.info("Email verified and auto-login token issued for user: {}", email);
        return response;
    }

    // ================= RESEND OTP =================
    @Transactional
    public MessageResponseDTO resendOtp(String email) {
        String normalizedEmail = email.trim().toLowerCase();

        // Check cooldown if record exists (don't reveal if email exists)
        Optional<EmailVerificationOtp> existing = emailVerificationOtpRepository.findByEmail(normalizedEmail);
        if (existing.isPresent()) {
            EmailVerificationOtp record = existing.get();
            if (record.getResendAvailableAt() != null
                    && LocalDateTime.now().isBefore(record.getResendAvailableAt())) {
                throw new RuntimeException("Please wait before requesting another OTP.");
            }
            emailVerificationOtpRepository.deleteByEmail(normalizedEmail);
        }

        // Find user — if not found, return generic message (no email enumeration)
        Optional<User> userOpt = userRepository.findByEmail(normalizedEmail);
        if (userOpt.isPresent() && !userOpt.get().isEmailVerified()) {
            User user = userOpt.get();

            String plainOtp = generateOtp();
            String otpHash = passwordEncoder.encode(plainOtp);

            EmailVerificationOtp otpRecord = new EmailVerificationOtp();
            otpRecord.setEmail(normalizedEmail);
            otpRecord.setOtpHash(otpHash);
            otpRecord.setExpiresAt(LocalDateTime.now().plusMinutes(5));
            otpRecord.setResendAvailableAt(LocalDateTime.now().plusSeconds(60));
            otpRecord.setAttempts(0);
            otpRecord.setMaxAttempts(5);
            emailVerificationOtpRepository.save(otpRecord);

            try {
                emailService.sendOtpVerificationEmail(user.getName(), normalizedEmail, plainOtp);
            } catch (Exception e) {
                logger.error("Resend OTP email failed for {}: {}", normalizedEmail, e.getMessage());
            }
        }

        // Always return generic message
        return new MessageResponseDTO("If your email is registered and unverified, a new OTP has been sent.");
    }

    // ================= LOGIN EXISTING USER =================
    @Transactional(readOnly = true)
    public AuthResponseDTO loginUser(UserLoginDTO loginDTO) {

        String identifier = loginDTO.getIdentifier().trim();

        // Detect if identifier is an email (contains @) or a phone number
        User user;
        if (identifier.contains("@")) {
            user = userRepository.findByEmail(identifier)
                    .orElseThrow(() -> new RuntimeException("Invalid email or password"));
        } else {
            user = userRepository.findByPhone(identifier)
                    .orElseThrow(() -> new RuntimeException("Invalid phone number or password"));
        }

        // Verify password
        if (!passwordEncoder.matches(loginDTO.getPassword(), user.getPassword())) {
            throw new RuntimeException(
                    identifier.contains("@") ? "Invalid email or password" : "Invalid phone number or password");
        }

        // Block unverified emails (ADMIN is exempt)
        if (user.getRole() != User.Role.ADMIN && !user.isEmailVerified()) {
            throw new RuntimeException("Please verify your email before logging in.");
        }

        // Check Verification for Practitioners
        if (user.getRole() == User.Role.PRACTITIONER) {
            Optional<PractitionerProfile> profileOpt = practitionerProfileRepository.findByUser_Id(user.getId());

            if (profileOpt.isPresent()) {
                PractitionerProfile profile = profileOpt.get();
                if (!Boolean.TRUE.equals(profile.getVerified())) {
                    throw new RuntimeException("Your account is pending admin verification");
                }
            }
            // If no profile exists yet, allow login so practitioner can complete onboarding
        }

        // Generate JWT tokens using email and role
        String accessToken = jwtService.generateToken(user.getEmail(), user.getRole().toString());
        String refreshToken = jwtService.generateRefreshToken(user.getEmail());

        // Map entity → DTO
        UserDTO userDTO = userService.mapToDTO(user);

        AuthResponseDTO response = new AuthResponseDTO();
        response.setUser(userDTO);
        response.setAccessToken(accessToken);
        response.setRefreshToken(refreshToken);

        return response;
    }

    // ================= REFRESH ACCESS TOKEN =================
    @Transactional(readOnly = true)
    public AuthResponseDTO refreshToken(String refreshToken) {

        // Extract email from refresh token
        String email = jwtService.extractUsername(refreshToken);

        // Validate refresh token with email
        if (!jwtService.validateToken(refreshToken, email)) {
            throw new RuntimeException("Invalid or expired refresh token");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found for token"));

        // Generate new access token
        String newAccessToken = jwtService.generateToken(user.getEmail(), user.getRole().toString());

        // Map entity → DTO
        UserDTO userDTO = userService.mapToDTO(user);

        AuthResponseDTO response = new AuthResponseDTO();
        response.setUser(userDTO);
        response.setAccessToken(newAccessToken);
        response.setRefreshToken(refreshToken); // keep the same refresh token

        return response;
    }

    // ================= REQUEST PASSWORD RESET =================
    /**
     * Initiates password reset flow:
     * - Finds user by email
     * - Deletes old tokens for user
     * - Generates new reset token (UUID)
     * - Sets expiry to 30 minutes
     * - Sends reset email
     * - Returns generic success message (does NOT reveal if email exists)
     */
    @Transactional
    public void requestPasswordReset(String email) {
        // Find user (but don't throw exception to prevent email enumeration)
        var userOpt = userRepository.findByEmail(email.toLowerCase().trim());

        if (userOpt.isPresent()) {
            User user = userOpt.get();

            // Delete existing reset tokens for this user
            passwordResetTokenRepository.deleteByUser(user);

            // Generate unique token
            String token = UUID.randomUUID().toString();

            // Set expiry to 30 minutes from now
            LocalDateTime expiryDate = LocalDateTime.now().plusMinutes(30);

            // Create and save token
            PasswordResetToken resetToken = new PasswordResetToken(token, user, expiryDate);
            passwordResetTokenRepository.save(resetToken);

            // Send reset email with link
            String resetLink = "http://localhost:5173/reset-password?token=" + token;
            try {
                emailService.sendPasswordResetEmail(user.getEmail(), user.getName(), resetLink);
                logger.info("Password reset email sent to {}", email);
            } catch (Exception e) {
                logger.error("Failed to send password reset email to {}: {}", email, e.getMessage());
                // Still return success to prevent email enumeration
            }
        } else {
            // Log attempt but don't throw exception (security)
            logger.warn("Password reset requested for non-existent email: {}", email);
        }

        // Always return success message (do NOT reveal if email exists)
    }

    // ================= RESET PASSWORD =================
    /**
     * Completes password reset flow:
     * - Validates token exists and is not expired/used
     * - Hashes new password with BCrypt
     * - Updates user password
     * - Marks token as used
     * - Deletes token
     */
    @Transactional
    public void resetPassword(String token, String newPassword) {
        // Validate token exists
        PasswordResetToken resetToken = passwordResetTokenRepository.findByToken(token)
                .orElseThrow(() -> new RuntimeException("Invalid or expired reset link"));

        // Validate token is not expired
        if (resetToken.isExpired()) {
            throw new RuntimeException("Reset link has expired. Please request a new one.");
        }

        // Validate token has not been used
        if (resetToken.isUsed()) {
            throw new RuntimeException("Reset link has already been used");
        }

        // Validate password strength (minimum requirements)
        validatePasswordStrength(newPassword);

        // Get user and update password
        User user = resetToken.getUser();
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // Mark token as used
        resetToken.setUsed(true);
        passwordResetTokenRepository.save(resetToken);

        // Delete token (optional but recommended for security)
        passwordResetTokenRepository.deleteById(resetToken.getId());

        logger.info("Password reset successful for user: {}", user.getEmail());
    }

    // ================= VALIDATE PASSWORD STRENGTH =================
    /**
     * Validates password meets minimum security requirements:
     * - At least 8 characters
     * - At least one uppercase letter
     * - At least one lowercase letter
     * - At least one digit
     * - At least one special character
     */
    private void validatePasswordStrength(String password) {
        if (password == null || password.length() < 8) {
            throw new RuntimeException("Password must be at least 8 characters long");
        }

        if (!password.matches(".*[A-Z].*")) {
            throw new RuntimeException("Password must contain at least one uppercase letter");
        }

        if (!password.matches(".*[a-z].*")) {
            throw new RuntimeException("Password must contain at least one lowercase letter");
        }

        if (!password.matches(".*\\d.*")) {
            throw new RuntimeException("Password must contain at least one digit");
        }

        if (!password.matches(".*[!@#$%^&*()_+\\-=\\[\\]{};':\\\"\\\\|,.<>/?].*")) {
            throw new RuntimeException("Password must contain at least one special character (!@#$%^&* etc.)");
        }
    }

    // ================= GENERATE OTP =================
    private String generateOtp() {
        SecureRandom random = new SecureRandom();
        int otp = 100000 + random.nextInt(900000); // always 6 digits
        return String.valueOf(otp);
    }
}