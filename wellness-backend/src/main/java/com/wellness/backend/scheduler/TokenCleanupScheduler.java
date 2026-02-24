package com.wellness.backend.scheduler;

import com.wellness.backend.repository.PasswordResetTokenRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * Scheduled tasks for token cleanup and maintenance.
 * Deletes expired password reset tokens daily to keep the database clean.
 */
@Component
public class TokenCleanupScheduler {

    private static final Logger logger = LoggerFactory.getLogger(TokenCleanupScheduler.class);

    private final PasswordResetTokenRepository passwordResetTokenRepository;

    @Autowired
    public TokenCleanupScheduler(PasswordResetTokenRepository passwordResetTokenRepository) {
        this.passwordResetTokenRepository = passwordResetTokenRepository;
    }

    /**
     * Runs daily at 2:00 AM to delete expired password reset tokens.
     * Expression: 0 0 2 * * * (every day at 2:00 AM)
     */
    @Scheduled(cron = "0 0 2 * * *")
    public void deleteExpiredTokens() {
        try {
            LocalDateTime now = LocalDateTime.now();
            passwordResetTokenRepository.deleteExpiredTokens(now);
            logger.info("Expired password reset tokens cleaned up successfully at {}", now);
        } catch (Exception e) {
            logger.error("Error during token cleanup: {}", e.getMessage(), e);
        }
    }
}
