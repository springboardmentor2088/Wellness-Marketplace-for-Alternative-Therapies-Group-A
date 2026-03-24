package com.wellness.backend.scheduler;

import com.wellness.backend.enums.PaymentStatus;
import com.wellness.backend.enums.SessionStatus;
import com.wellness.backend.model.TherapySession;
import com.wellness.backend.repository.TherapySessionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Component
public class HoldCleanupScheduler {

    private static final Logger logger = LoggerFactory.getLogger(HoldCleanupScheduler.class);

    @Autowired
    private TherapySessionRepository sessionRepository;

    /**
     * Runs every minute to clean up HOLD sessions that are older than 5 minutes.
     */
    @Scheduled(fixedRate = 60000)
    @Transactional
    public void cleanupExpiredHolds() {
        logger.info("Running HoldCleanupScheduler to manage expired session holds...");

        LocalDateTime cutoffTime = LocalDateTime.now().minusMinutes(5);

        List<TherapySession> expiredHolds = sessionRepository.findByStatusAndCreatedAtBefore(SessionStatus.HOLD,
                cutoffTime);

        int count = 0;
        for (TherapySession session : expiredHolds) {
            if (session.getPaymentStatus() == PaymentStatus.PENDING) {
                session.setStatus(SessionStatus.CANCELLED);
                session.setCancellationReason("Payment timeout");
                session.setCancelledBy(TherapySession.CancelledBy.ADMIN);
                sessionRepository.save(session);
                count++;
            }
        }

        if (count > 0) {
            logger.info("Cleaned up {} expired HOLD sessions.", count);
        }
    }
}

