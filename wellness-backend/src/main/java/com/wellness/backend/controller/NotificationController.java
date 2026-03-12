package com.wellness.backend.controller;

import com.wellness.backend.model.Notification;
import com.wellness.backend.model.User;
import com.wellness.backend.repository.NotificationRepository;
import com.wellness.backend.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationRepository notificationRepository;
    private final UserService userService;

    @Autowired
    public NotificationController(NotificationRepository notificationRepository, UserService userService) {
        this.notificationRepository = notificationRepository;
        this.userService = userService;
    }

    private Notification.ReceiverRole getRoleFromUser(User.Role userRole) {
        if (userRole == User.Role.PRACTITIONER) {
            return Notification.ReceiverRole.PRACTITIONER;
        }
        return Notification.ReceiverRole.USER;
    }

    // ================= GET PAGINATED NOTIFICATIONS =================
    @GetMapping
    public ResponseEntity<Page<Notification>> getNotifications(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        User currentUser = userService.getCurrentAuthenticatedUser();
        Notification.ReceiverRole role = getRoleFromUser(currentUser.getRole());

        Pageable pageable = PageRequest.of(page, size);
        Page<Notification> notifications = notificationRepository
                .findByReceiverIdAndReceiverRoleOrderByCreatedAtDesc(Long.valueOf(currentUser.getId()), role, pageable);

        return ResponseEntity.ok(notifications);
    }

    // ================= GET UNREAD COUNT =================
    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount() {
        User currentUser = userService.getCurrentAuthenticatedUser();
        Notification.ReceiverRole role = getRoleFromUser(currentUser.getRole());

        long count = notificationRepository
                .countByReceiverIdAndReceiverRoleAndIsReadFalse(Long.valueOf(currentUser.getId()), role);
        return ResponseEntity.ok(Map.of("unreadCount", count));
    }

    // ================= MARK AS READ =================
    @PutMapping("/{id}/read")
    public ResponseEntity<Notification> markAsRead(@PathVariable Long id) {
        User currentUser = userService.getCurrentAuthenticatedUser();

        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Notification not found with id: " + id));

        // Ensure the notification belongs to the current user
        if (!notification.getReceiverId().equals(Long.valueOf(currentUser.getId()))) {
            throw new RuntimeException("Access denied");
        }

        notification.setRead(true);
        Notification saved = notificationRepository.save(notification);
        return ResponseEntity.ok(saved);
    }
}
