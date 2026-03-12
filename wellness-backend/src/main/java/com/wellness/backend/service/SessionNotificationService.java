package com.wellness.backend.service;

import com.wellness.backend.model.Notification;
import com.wellness.backend.repository.NotificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Service
public class SessionNotificationService {

        @Autowired
        private SimpMessagingTemplate messagingTemplate;

        @Autowired
        private NotificationRepository notificationRepository;

        @Autowired
        private EmailService emailService;

        // ================= ENUM FOR NOTIFICATION TYPES =================
        public enum NotificationType {
                SESSION_BOOKED,
                SESSION_CANCELLED,
                SESSION_RESCHEDULED,
                SESSION_REMINDER,
                SESSION_COMPLETED,
                PAYMENT_RECEIVED,
                ORDER_STATUS_CHANGED,
                REMINDER_30_MIN, // Added for 30-minute reminder
                GENERAL
        }

        // ================= GENERIC NOTIFICATION METHOD =================
        public Notification sendNotification(Integer userId, NotificationType type, String message,
                        Map<String, Object> data) {
                // 1. Save to DB
                Notification notificationEntity = new Notification(
                                Long.valueOf(userId),
                                Notification.ReceiverRole.USER,
                                type,
                                message);
                Notification savedNotification = notificationRepository.save(notificationEntity);

                // 2. Send via WebSocket
                Map<String, Object> notification = new HashMap<>();
                notification.put("id", savedNotification.getId());
                notification.put("type", type.toString());
                notification.put("message", message);
                notification.put("isRead", savedNotification.isRead());
                notification.put("createdAt",
                                savedNotification.getCreatedAt() != null ? savedNotification.getCreatedAt().toString()
                                                : LocalDateTime.now().toString());
                notification.put("timestamp", LocalDateTime.now().toString()); // Keep for backward compatibility
                if (data != null) {
                        notification.putAll(data);
                }

                messagingTemplate.convertAndSend(
                                "/topic/user/" + userId,
                                notification);

                return savedNotification;
        }

        public Notification sendNotificationToPractitioner(Integer practitionerId, NotificationType type,
                        String message,
                        Map<String, Object> data) {
                // 1. Save to DB
                Notification notificationEntity = new Notification(
                                Long.valueOf(practitionerId),
                                Notification.ReceiverRole.PRACTITIONER,
                                type,
                                message);
                Notification savedNotification = notificationRepository.save(notificationEntity);

                // 2. Send via WebSocket
                Map<String, Object> notification = new HashMap<>();
                notification.put("id", savedNotification.getId());
                notification.put("type", type.toString());
                notification.put("message", message);
                notification.put("isRead", savedNotification.isRead());
                notification.put("createdAt",
                                savedNotification.getCreatedAt() != null ? savedNotification.getCreatedAt().toString()
                                                : LocalDateTime.now().toString());
                notification.put("timestamp", LocalDateTime.now().toString()); // Keep for backward compatibility
                if (data != null) {
                        notification.putAll(data);
                }

                messagingTemplate.convertAndSend(
                                "/topic/practitioner/" + practitionerId,
                                notification);

                return savedNotification;
        }

        // ================= SPECIFIC NOTIFICATION METHODS =================
        public void notifySessionBooked(Integer userId, Integer practitionerId, String practitionerName,
                        LocalDateTime sessionDateTime) {
                Map<String, Object> data = new HashMap<>();
                data.put("eventType", "SESSION_BOOKED");
                data.put("practitionerName", practitionerName);
                data.put("sessionDateTime", sessionDateTime.toString());

                sendNotification(userId, NotificationType.SESSION_BOOKED,
                                "Your session with " + practitionerName + " has been booked for "
                                                + sessionDateTime.toLocalDate(),
                                data);

                sendNotificationToPractitioner(practitionerId, NotificationType.SESSION_BOOKED,
                                "New session booking from user",
                                data);
        }

        public void notifySessionCancelled(Integer userId, Integer practitionerId, String reason) {
                Map<String, Object> data = new HashMap<>();
                data.put("eventType", "SESSION_CANCELLED");
                data.put("reason", reason);

                sendNotification(userId, NotificationType.SESSION_CANCELLED,
                                "Your session has been cancelled. Reason: " + reason,
                                data);

                sendNotificationToPractitioner(practitionerId, NotificationType.SESSION_CANCELLED,
                                "Session has been cancelled",
                                data);
        }

        public void notifySessionRescheduled(Integer userId, Integer practitionerId, LocalDateTime newDateTime) {
                Map<String, Object> data = new HashMap<>();
                data.put("eventType", "SESSION_RESCHEDULED");
                data.put("newSessionDateTime", newDateTime.toString());

                sendNotification(userId, NotificationType.SESSION_RESCHEDULED,
                                "Your session has been rescheduled to " + newDateTime.toLocalDate(),
                                data);

                sendNotificationToPractitioner(practitionerId, NotificationType.SESSION_RESCHEDULED,
                                "Session has been rescheduled",
                                data);
        }

        public void notifySessionReminder(Integer userId, Integer practitionerId, LocalDateTime sessionDateTime) {
                Map<String, Object> data = new HashMap<>();
                data.put("eventType", "SESSION_REMINDER");
                data.put("sessionDateTime", sessionDateTime.toString());

                sendNotification(userId, NotificationType.SESSION_REMINDER,
                                "Your session is coming up at " + sessionDateTime.toLocalTime(),
                                data);

                sendNotificationToPractitioner(practitionerId, NotificationType.SESSION_REMINDER,
                                "Upcoming session reminder",
                                data);
        }

        public void notifySessionReminder30Min(Integer userId, String userEmail, String userName,
                        Integer practitionerId,
                        LocalDateTime sessionDateTime) {
                Map<String, Object> data = new HashMap<>();
                data.put("eventType", "REMINDER_30_MIN");
                data.put("sessionDateTime", sessionDateTime.toString());

                Notification userNotification = sendNotification(userId, NotificationType.REMINDER_30_MIN,
                                "Your session is coming up in 30 minutes at " + sessionDateTime.toLocalTime(),
                                data);

                try {
                        emailService.sendSessionReminderEmail(userName, userEmail, sessionDateTime);
                        userNotification.setEmailSent(true);
                        notificationRepository.save(userNotification);
                } catch (Exception e) {
                        // Log but don't fail if DB isn't updated
                }

                sendNotificationToPractitioner(practitionerId, NotificationType.REMINDER_30_MIN,
                                "Upcoming session reminder in 30 mins",
                                data);
        }

        public void notifySessionCompleted(Integer userId, Integer practitionerId) {
                Map<String, Object> data = new HashMap<>();
                data.put("eventType", "SESSION_COMPLETED");

                sendNotification(userId, NotificationType.SESSION_COMPLETED,
                                "Your session has been completed. Please leave a review!",
                                data);
        }

        public void notifyPaymentReceived(Integer userId, String amount) {
                Map<String, Object> data = new HashMap<>();
                data.put("eventType", "PAYMENT_RECEIVED");
                data.put("amount", amount);

                sendNotification(userId, NotificationType.PAYMENT_RECEIVED,
                                "Payment of ₹" + amount + " has been received",
                                data);
        }

        public void notifyOrderStatusChanged(Integer userId, String orderId, String newStatus) {
                Map<String, Object> data = new HashMap<>();
                data.put("eventType", "ORDER_STATUS_CHANGED");
                data.put("orderId", orderId);
                data.put("newStatus", newStatus);

                sendNotification(userId, NotificationType.ORDER_STATUS_CHANGED,
                                "Your order #" + orderId + " status has been updated to " + newStatus,
                                data);
        }

        // ================= LEGACY METHODS (For backward compatibility)
        // =================
        public void notifyPractitioner(Integer practitionerId, String message) {
                sendNotificationToPractitioner(practitionerId, NotificationType.GENERAL, message, null);
        }

        public void notifyUser(Integer userId, String message) {
                sendNotification(userId, NotificationType.GENERAL, message, null);
        }
}
