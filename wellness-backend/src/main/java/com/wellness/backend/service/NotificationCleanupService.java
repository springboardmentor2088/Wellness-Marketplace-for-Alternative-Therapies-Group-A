package com.wellness.backend.service;

import com.wellness.backend.repository.NotificationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class NotificationCleanupService {

    private static final Logger logger = LoggerFactory.getLogger(NotificationCleanupService.class);

    private final NotificationRepository notificationRepository;

    @Autowired
    public NotificationCleanupService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    /**
     * Scheduled job to run once per day at 2:00 AM (server time).
     * Deletes notifications where:
     * - is_read = true
     * - created_at < NOW() - 30 days
     *
     * Unread notifications are never deleted automatically.
     */
    @Scheduled(cron = "0 0 2 * * ?")
    @Transactional
    public void cleanupOldNotifications() {
        logger.info("Starting scheduled cleanup of read notifications older than 30 days.");
        try {
            LocalDateTime cutoffDate = LocalDateTime.now().minusDays(30);
            int deletedCount = notificationRepository.deleteByIsReadTrueAndCreatedAtBefore(cutoffDate);
            logger.info("Successfully deleted {} old read notifications.", deletedCount);
        } catch (Exception e) {
            logger.error("Failed to cleanup old notifications: ", e);
        }
    }
}
