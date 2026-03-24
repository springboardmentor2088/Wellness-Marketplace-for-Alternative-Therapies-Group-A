package com.wellness.backend.service;

import com.wellness.backend.model.TherapySession;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

@Service
public class RefundPolicyService {

    /**
     * Calculates the refund amount based on the cancellation policy.
     * 
     * Policy:
     * - If cancelled by Practitioner: 100% refund.
     * - If cancelled by User:
     * - More than 24 hours before session: 100% refund.
     * - Less than 24 hours before session: 50% refund.
     * - Past session start: 0% refund.
     */
    public BigDecimal calculateRefundAmount(TherapySession session, TherapySession.CancelledBy cancelledBy,
            BigDecimal paidAmount) {
        if (cancelledBy == TherapySession.CancelledBy.PRACTITIONER || cancelledBy == TherapySession.CancelledBy.ADMIN) {
            return paidAmount; // Full refund
        }

        // Cancelled by User
        LocalDateTime sessionStartDateTime = session.getSessionDate().atTime(session.getStartTime());
        LocalDateTime now = LocalDateTime.now();

        if (now.isAfter(sessionStartDateTime)) {
            return BigDecimal.ZERO; // No refund if session has already started/passed
        }

        long hoursUntilSession = ChronoUnit.HOURS.between(now, sessionStartDateTime);

        if (hoursUntilSession >= 24) {
            return paidAmount; // 100% refund
        } else {
            return paidAmount.multiply(new BigDecimal("0.50")); // 50% refund
        }
    }
}
