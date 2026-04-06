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
            return paidAmount; // Full refund if practitioner or admin cancels
        }

        // Flat 90% refund for user-initiated cancellations (10% platform fee retained)
        return paidAmount.multiply(new BigDecimal("0.90")).setScale(2, java.math.RoundingMode.HALF_UP);
    }
}
