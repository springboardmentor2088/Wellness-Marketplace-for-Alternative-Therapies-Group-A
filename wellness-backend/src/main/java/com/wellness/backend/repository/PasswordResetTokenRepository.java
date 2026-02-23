package com.wellness.backend.repository;

import com.wellness.backend.model.PasswordResetToken;
import com.wellness.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {

    /**
     * Find a password reset token by its unique token string.
     */
    Optional<PasswordResetToken> findByToken(String token);

    /**
     * Delete all password reset tokens for a specific user.
     */
    @Modifying
    @Transactional
    void deleteByUser(User user);

    /**
     * Delete all expired tokens (cleanup job).
     */
    @Modifying
    @Transactional
    @Query("DELETE FROM PasswordResetToken t WHERE t.expiryDate < :now")
    void deleteExpiredTokens(@Param("now") LocalDateTime now);
}
