package com.wellness.backend.service;

import com.wellness.backend.enums.SessionStatus;
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

@Service
public class SessionReminderScheduler {

    private static final Logger logger = LoggerFactory.getLogger(SessionReminderScheduler.class);

    @Autowired
    private TherapySessionRepository therapySessionRepository;

    @Autowired
    private SessionNotificationService notificationService;

    @Value("${app.session.reminder.enabled:true}")
    private boolean reminderEnabled;

    @Value("${app.session.reminder.interval-minutes:30}")
    private int reminderIntervalMinutes;

    @Value("${app.session.reminder.one-hour-enabled:true}")
    private boolean oneHourReminderEnabled;

    @Scheduled(fixedRate = 60000)
    @Transactional
    public void sendSessionReminders() {
        if (!reminderEnabled) {
            logger.debug("Session reminders are disabled");
            return;
        }

        try {
            LocalDateTime now = LocalDateTime.now(ZoneId.systemDefault());
            LocalDateTime reminderWindow = now.plusMinutes(reminderIntervalMinutes);

            List<TherapySession> sessionsNeedingReminder = therapySessionRepository
                    .findSessionsForReminder(now.toLocalTime(), reminderWindow.toLocalTime());

            if (sessionsNeedingReminder.isEmpty()) {
                return;
            }

            for (TherapySession session : sessionsNeedingReminder) {
                try {
                    sendReminderForSession(session);
                } catch (Exception e) {
                    logger.error("Error sending reminder for session ID: {}", session.getId(), e);
                }
            }
        } catch (Exception e) {
            logger.error("Fatal error in session reminder scheduler", e);
        }
    }

    @Scheduled(fixedRate = 60000)
    @Transactional
    public void sendOneHourSessionReminders() {
        if (!reminderEnabled || !oneHourReminderEnabled) {
            return;
        }

        try {
            LocalDateTime now = LocalDateTime.now(ZoneId.systemDefault());
            LocalDateTime windowStart = now.plusMinutes(45);
            LocalDateTime windowEnd = now.plusMinutes(60);

            List<TherapySession> sessionsNeedingOneHourReminder = therapySessionRepository
                    .findSessionsForOneHourReminder(windowStart.toLocalTime(), windowEnd.toLocalTime());

            for (TherapySession session : sessionsNeedingOneHourReminder) {
                try {
                    sendOneHourReminderForSession(session);
                } catch (Exception e) {
                    logger.error("Error sending 1-hour reminder for session ID: {}", session.getId(), e);
                }
            }
        } catch (Exception e) {
            logger.error("Fatal error in 1-hour reminder scheduler", e);
        }
    }

    private void sendReminderForSession(TherapySession session) throws Exception {
        Integer userId = session.getUser().getId();
        Integer practitionerUserId = session.getPractitioner().getUser().getId();
        LocalDateTime sessionDateTime = LocalDateTime.of(session.getSessionDate(), session.getStartTime());

        notificationService.notifySessionReminder30Min(
                userId,
                session.getUser().getEmail(),
                session.getUser().getName(),
                practitionerUserId,
                sessionDateTime);

        session.setReminderSent(true);
        therapySessionRepository.save(session);
    }

    private void sendOneHourReminderForSession(TherapySession session) throws Exception {
        Integer userId = session.getUser().getId();
        Integer practitionerUserId = session.getPractitioner().getUser().getId();
        LocalDateTime sessionDateTime = LocalDateTime.of(session.getSessionDate(), session.getStartTime());

        notificationService.notifySessionReminder(
                userId,
                practitionerUserId,
                sessionDateTime);

        session.setOneHourReminderSent(true);
        therapySessionRepository.save(session);
    }

    @Transactional
    public boolean triggerReminderForSession(Integer sessionId) {
        try {
            TherapySession session = therapySessionRepository.findById(sessionId)
                    .orElseThrow(() -> new IllegalArgumentException("Session not found: " + sessionId));

            if (!session.getStatus().equals(SessionStatus.BOOKED)) {
                return false;
            }

            sendReminderForSession(session);
            return true;
        } catch (Exception e) {
            logger.error("Error in manual reminder trigger for session ID: {}", sessionId, e);
            return false;
        }
    }

    public String getSchedulerStatus() {
        return "Reminders Enabled: " + reminderEnabled + ", Interval: " + reminderIntervalMinutes;
    }
}
