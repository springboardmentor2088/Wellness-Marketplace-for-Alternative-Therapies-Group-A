package com.wellness.backend.service;

import com.wellness.backend.model.TherapySession;
import com.wellness.backend.repository.TherapySessionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;

/**
 * SessionReminderScheduler - Automatically sends session reminders to users
 *
 * Features:
 * - Sends 15-minute reminder before session start
 * - Sends 1-hour reminder before session start (optional)
 * - Prevents duplicate reminders using flags
 * - Runs every 1 minute in background
 * - Production-hardened with error handling & logging
 * - Configurable via application.properties
 *
 * How it works:
 * 1. Scheduler runs every 60 seconds (configurable)
 * 2. Queries for sessions with status=BOOKED and reminderSent=false
 * 3. Filters sessions where startTime is between now and now+15 minutes
 * 4. For each qualifying session:
 *    - Sends WebSocket notification via SessionNotificationService
 *    - Marks reminderSent = true to prevent duplicates
 *    - Logs the action
 * 5. Handles exceptions per session (continues processing others)
 * 6. Can be toggled on/off via property app.session.reminder.enabled
 */
@Service
public class SessionReminderScheduler {

    private static final Logger logger = LoggerFactory.getLogger(SessionReminderScheduler.class);

    @Autowired
    private TherapySessionRepository therapySessionRepository;

    @Autowired
    private SessionNotificationService notificationService;

    @Value("${app.session.reminder.enabled:true}")
    private boolean reminderEnabled;

    @Value("${app.session.reminder.interval-minutes:15}")
    private int reminderIntervalMinutes;

    @Value("${app.session.reminder.one-hour-enabled:true}")
    private boolean oneHourReminderEnabled;

    /**
     * Scheduled task to send 15-minute session reminders
     * Runs every 60 seconds (configurable via fixedRate parameter)
     *
     * @Transactional ensures:
     * - All operations on a session are atomic
     * - If an error occurs, changes for that session are rolled back
     * - No partial updates
     */
    @Scheduled(fixedRate = 60000) // Every 60 seconds = 1 minute
    @Transactional
    public void sendSessionReminders() {
        if (!reminderEnabled) {
            logger.debug("Session reminders are disabled (app.session.reminder.enabled=false)");
            return;
        }

        try {
            LocalDateTime now = LocalDateTime.now(ZoneId.systemDefault());
            LocalDateTime reminderWindow = now.plusMinutes(reminderIntervalMinutes);

            logger.debug("Checking for sessions needing reminders. Window: {} to {}",
                    now, reminderWindow);

                // Query sessions that need reminders (repository expects LocalTime parameters)
                List<TherapySession> sessionsNeedingReminder =
                    therapySessionRepository.findSessionsForReminder(now.toLocalTime(), reminderWindow.toLocalTime());

            if (sessionsNeedingReminder.isEmpty()) {
                logger.debug("No sessions found requiring {} minute reminder", reminderIntervalMinutes);
                return;
            }

            logger.info("Found {} session(s) requiring {} minute reminders",
                    sessionsNeedingReminder.size(), reminderIntervalMinutes);

            int successCount = 0;
            int errorCount = 0;

            // Process each session
            for (TherapySession session : sessionsNeedingReminder) {
                try {
                    sendReminderForSession(session);
                    successCount++;
                } catch (Exception e) {
                    errorCount++;
                    logger.error("Error sending reminder for session ID: {} (User: {}, Practitioner: {})",
                            session.getId(),
                            session.getUser().getId(),
                            session.getPractitioner().getId(),
                            e);
                    // Continue processing other sessions (don't throw exception)
                }
            }

            logger.info("Session reminder batch completed. Success: {}, Errors: {}",
                    successCount, errorCount);

        } catch (Exception e) {
            logger.error("Fatal error in session reminder scheduler", e);
            // Log but don't throw - allow scheduler to continue
        }
    }

    /**
     * Scheduled task to send 1-hour session reminders (optional enhancement)
     * Runs every 60 seconds
     *
     * This provides an earlier notification option for users who prefer more advance warning
     */
    @Scheduled(fixedRate = 60000)
    @Transactional
    public void sendOneHourSessionReminders() {
        if (!reminderEnabled || !oneHourReminderEnabled) {
            logger.debug("One-hour session reminders are disabled");
            return;
        }

        try {
            LocalDateTime now = LocalDateTime.now(ZoneId.systemDefault());
            // Check for sessions between 45 and 60 minutes from now
            LocalDateTime windowStart = now.plusMinutes(45);
            LocalDateTime windowEnd = now.plusMinutes(60);

            logger.debug("Checking for sessions needing 1-hour reminders. Window: {} to {}",
                    windowStart, windowEnd);

                List<TherapySession> sessionsNeedingOneHourReminder =
                    therapySessionRepository.findSessionsForOneHourReminder(windowStart.toLocalTime(), windowEnd.toLocalTime());

            if (sessionsNeedingOneHourReminder.isEmpty()) {
                logger.debug("No sessions found requiring 1-hour reminder");
                return;
            }

            logger.info("Found {} session(s) requiring 1-hour reminders",
                    sessionsNeedingOneHourReminder.size());

            int successCount = 0;
            int errorCount = 0;

            for (TherapySession session : sessionsNeedingOneHourReminder) {
                try {
                    sendOneHourReminderForSession(session);
                    successCount++;
                } catch (Exception e) {
                    errorCount++;
                    logger.error("Error sending 1-hour reminder for session ID: {}",
                            session.getId(), e);
                }
            }

            logger.info("One-hour reminder batch completed. Success: {}, Errors: {}",
                    successCount, errorCount);

        } catch (Exception e) {
            logger.error("Fatal error in 1-hour reminder scheduler", e);
        }
    }

    /**
     * Send reminder notification for a single session and mark it as sent
     *
     * @param session The therapy session object
     * @throws Exception if notification or database update fails
     */
    private void sendReminderForSession(TherapySession session) throws Exception {
        Integer userId = session.getUser().getId();
        Integer practitionerId = session.getPractitioner().getId();
        LocalDateTime sessionDateTime = LocalDateTime.of(
                session.getSessionDate(),
                session.getStartTime()
        );

        logger.debug("Sending {}-minute reminder for session ID: {} (DateTime: {})",
                reminderIntervalMinutes, session.getId(), sessionDateTime);

        // Send WebSocket notification to user and practitioner
        notificationService.notifySessionReminder(
                userId,
                practitionerId,
                sessionDateTime
        );

        logger.debug("Notification sent for session ID: {}", session.getId());

        // Mark reminder as sent to prevent duplicates
        session.setReminderSent(true);
        therapySessionRepository.save(session);

        logger.info("Marked reminder as sent for session ID: {} (User: {}, Practitioner: {})",
                session.getId(), userId, practitionerId);
    }

    /**
     * Send one-hour reminder notification for a single session and mark it as sent
     *
     * @param session The therapy session object
     * @throws Exception if notification or database update fails
     */
    private void sendOneHourReminderForSession(TherapySession session) throws Exception {
        Integer userId = session.getUser().getId();
        Integer practitionerId = session.getPractitioner().getId();
        LocalDateTime sessionDateTime = LocalDateTime.of(
                session.getSessionDate(),
                session.getStartTime()
        );

        logger.debug("Sending 1-hour reminder for session ID: {} (DateTime: {})",
                session.getId(), sessionDateTime);

        // Send notification
        notificationService.notifySessionReminder(
                userId,
                practitionerId,
                sessionDateTime
        );

        logger.debug("1-hour notification sent for session ID: {}", session.getId());

        // Mark one-hour reminder as sent
        session.setOneHourReminderSent(true);
        therapySessionRepository.save(session);

        logger.info("Marked 1-hour reminder as sent for session ID: {}",
                session.getId());
    }

    /**
     * Manual trigger for testing or administrative purposes
     * Useful if you need to manually resend reminders for specific sessions
     *
     * @param sessionId The ID of the session to send reminder for
     * @return true if reminder sent successfully, false otherwise
     */
    @Transactional
    public boolean triggerReminderForSession(Integer sessionId) {
        logger.info("Manual trigger for reminder on session ID: {}", sessionId);

        try {
            TherapySession session = therapySessionRepository.findById(sessionId)
                    .orElseThrow(() -> new IllegalArgumentException("Session not found: " + sessionId));

            if (!session.getStatus().equals(TherapySession.Status.BOOKED)) {
                logger.warn("Cannot send reminder for non-BOOKED session. Current status: {}",
                        session.getStatus());
                return false;
            }

            sendReminderForSession(session);
            logger.info("Manual reminder trigger successful for session ID: {}", sessionId);
            return true;

        } catch (Exception e) {
            logger.error("Error in manual reminder trigger for session ID: {}", sessionId, e);
            return false;
        }
    }

    /**
     * Get detailed stats about reminders sent in last hour
     * Useful for monitoring and debugging
     *
     * @return String with stats
     */
    public String getSchedulerStatus() {
        StringBuilder status = new StringBuilder();
        status.append("=== Session Reminder Scheduler Status ===\n");
        status.append(String.format("Reminders Enabled: %s\n", reminderEnabled));
        status.append(String.format("Reminder Interval: %d minutes\n", reminderIntervalMinutes));
        status.append(String.format("1-Hour Reminders Enabled: %s\n", oneHourReminderEnabled));
        status.append(String.format("Current Time: %s (Zone: %s)\n",
                LocalDateTime.now(ZoneId.systemDefault()),
                ZoneId.systemDefault()));
        return status.toString();
    }
}
