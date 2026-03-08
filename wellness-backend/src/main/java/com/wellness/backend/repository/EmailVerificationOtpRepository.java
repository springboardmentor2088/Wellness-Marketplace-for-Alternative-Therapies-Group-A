package com.wellness.backend.repository;

import com.wellness.backend.model.EmailVerificationOtp;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EmailVerificationOtpRepository extends JpaRepository<EmailVerificationOtp, Long> {
    Optional<EmailVerificationOtp> findByEmail(String email);

    void deleteByEmail(String email);
}
