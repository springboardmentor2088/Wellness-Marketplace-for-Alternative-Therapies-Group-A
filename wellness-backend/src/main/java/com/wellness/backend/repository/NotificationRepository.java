package com.wellness.backend.repository;

import com.wellness.backend.model.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    Page<Notification> findByReceiverIdAndReceiverRoleOrderByCreatedAtDesc(
            Long receiverId, Notification.ReceiverRole receiverRole, Pageable pageable);

    long countByReceiverIdAndReceiverRoleAndIsReadFalse(Long receiverId, Notification.ReceiverRole receiverRole);

    @Modifying
    @Query("DELETE FROM Notification n WHERE n.isRead = true AND n.createdAt < :cutoffDate")
    int deleteByIsReadTrueAndCreatedAtBefore(LocalDateTime cutoffDate);
}
