package com.wellness.backend.service;

import com.wellness.backend.dto.AuthResponseDTO;
import com.wellness.backend.dto.UserLoginDTO;
import com.wellness.backend.dto.UserRegisterDTO;
import com.wellness.backend.dto.UserDTO;
import com.wellness.backend.model.User;
import com.wellness.backend.model.PractitionerProfile;
import com.wellness.backend.model.PasswordResetToken;
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

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Service handling all authentication logic:
 * - User registration
 * - User login
 * - Refresh access token
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

    @Autowired
    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder,
            JwtService jwtService, UserService userService,
            EmailService emailService,
            PractitionerProfileRepository practitionerProfileRepository,
            PasswordResetTokenRepository passwordResetTokenRepository) {
        this.userRepository = userRepository;
        this.practitionerProfileRepository = practitionerProfileRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.userService = userService;
        this.emailService = emailService;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
    }

    // ================= REGISTER NEW USER =================
    @Transactional
    public AuthResponseDTO registerUser(UserRegisterDTO registerDTO) {

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

        // Save user
        User savedUser = userRepository.save(user);

        // Create Practitioner Profile if role is PRACTITIONER
        if (savedUser.getRole() == User.Role.PRACTITIONER) {
            PractitionerProfile profile = new PractitionerProfile();
            profile.setUser(savedUser);
            profile.setVerified(false); // Default to false
            profile.setSpecialization("General"); // Default or from DTO if available
            practitionerProfileRepository.save(profile);
        }

        // Send role-based registration email
        try {
            if (savedUser.getRole() == User.Role.PRACTITIONER) {
                emailService.sendPractitionerRegistrationEmail(savedUser.getName(), savedUser.getEmail());
            } else {
                emailService.sendUserWelcomeEmail(savedUser.getName(), savedUser.getEmail());
            }
        } catch (Exception e) {
            logger.error("Registration email failed for {}: {}", savedUser.getEmail(), e.getMessage());
        }

        // Generate JWT tokens using email and role
        String accessToken = jwtService.generateToken(savedUser.getEmail(), savedUser.getRole().toString());
        String refreshToken = jwtService.generateRefreshToken(savedUser.getEmail());

        // Map Entity → DTO
        UserDTO userDTO = userService.mapToDTO(savedUser);

        // Build response
        AuthResponseDTO response = new AuthResponseDTO();
        response.setUser(userDTO);
        response.setAccessToken(accessToken);
        response.setRefreshToken(refreshToken);

        return response;
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

        // Check Verification for Practitioners
        if (user.getRole() == User.Role.PRACTITIONER) {
            PractitionerProfile profile = practitionerProfileRepository.findByUser_Id(user.getId())
                    .orElseThrow(() -> new RuntimeException("Practitioner profile not found"));

            if (!Boolean.TRUE.equals(profile.getVerified())) {
                throw new RuntimeException("Your account is pending admin verification");
            }
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

        if (!password.matches(".*[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>/?].*")) {
            throw new RuntimeException("Password must contain at least one special character (!@#$%^&* etc.)");
        }
    }
}