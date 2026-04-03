package com.wellness.backend.repository;

import com.wellness.backend.enums.SessionStatus;
import com.wellness.backend.model.TherapySession;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface TherapySessionRepository extends JpaRepository<TherapySession, Integer> {

        @EntityGraph(attributePaths = {"user", "practitioner"})
        List<TherapySession> findAllByOrderBySessionDateDescStartTimeDesc();

        List<TherapySession> findByStatusAndCreatedAtBefore(SessionStatus status,
                        java.time.LocalDateTime createdAt);
        
        @EntityGraph(attributePaths = {"user", "practitioner"})
        List<TherapySession> findByUser_IdOrderBySessionDateAscStartTimeAsc(Integer userId);

        @EntityGraph(attributePaths = {"user", "practitioner"})
        List<TherapySession> findByPractitioner_IdOrderBySessionDateAscStartTimeAsc(Integer practitionerId);

        Optional<TherapySession> findByPractitioner_IdAndSessionDateAndStartTime(
                        Integer practitionerId, LocalDate sessionDate, LocalTime startTime);

        Optional<TherapySession> findByPractitioner_IdAndSessionDate(
                        Integer practitionerId, LocalDate sessionDate);

        // ================= Practitioner Overlap Check =================
        @Query("SELECT COUNT(s) > 0 FROM TherapySession s " +
                        "WHERE s.practitioner.id = :practitionerId " +
                        "AND s.sessionDate = :sessionDate " +
                        "AND s.status != 'CANCELLED' " +
                        "AND s.startTime < :endTime AND s.endTime > :startTime")
        boolean existsOverlappingSession(@Param("practitionerId") Integer practitionerId,
                        @Param("sessionDate") LocalDate sessionDate,
                        @Param("startTime") LocalTime startTime,
                        @Param("endTime") LocalTime endTime);

        // ================= NEW: User Overlap Check =================
        @Query("SELECT COUNT(s) > 0 FROM TherapySession s " +
                        "WHERE s.user.id = :userId " +
                        "AND s.sessionDate = :sessionDate " +
                        "AND s.status != 'CANCELLED' " +
                        "AND s.startTime < :endTime AND s.endTime > :startTime")
        boolean existsUserOverlappingSession(@Param("userId") Integer userId,
                        @Param("sessionDate") LocalDate sessionDate,
                        @Param("startTime") LocalTime startTime,
                        @Param("endTime") LocalTime endTime);

        // ================= Active Sessions For Slot Calculation =================
        @EntityGraph(attributePaths = {"user", "practitioner"})
        List<TherapySession> findByPractitioner_IdAndSessionDateAndStatusNot(
                        Integer practitionerId, LocalDate sessionDate, SessionStatus status);

        // ================= Practitioner History Filters =================
        @EntityGraph(attributePaths = {"user"})
        List<TherapySession> findByPractitioner_IdAndPrescribedDocumentUrlIsNotNullOrderBySessionDateDescStartTimeDesc(Integer practitionerId);

        @EntityGraph(attributePaths = {"user"})
        List<TherapySession> findByPractitioner_IdAndPatientDocumentUrlIsNotNullOrderBySessionDateDescStartTimeDesc(Integer practitionerId);
        @Query("SELECT s FROM TherapySession s WHERE s.practitioner.id = :practitionerId " +
                        "AND s.sessionDate = :sessionDate " +
                        "AND s.status != 'CANCELLED'")
        List<TherapySession> findActiveSessionsByPractitionerAndDate(
                        @Param("practitionerId") Integer practitionerId,
                        @Param("sessionDate") LocalDate sessionDate);

        // ================= 15-Min Reminder =================
        @Query("SELECT s FROM TherapySession s " +
                        "WHERE s.status = 'BOOKED' " +
                        "AND s.reminderSent = false " +
                        "AND s.sessionDate = CURRENT_DATE " +
                        "AND s.startTime >= :nowTime AND s.startTime <= :reminderTime")
        List<TherapySession> findSessionsForReminder(
                        @Param("nowTime") LocalTime nowTime,
                        @Param("reminderTime") LocalTime reminderTime);

        // ================= 1-Hour Reminder =================
        @Query("SELECT s FROM TherapySession s " +
                        "WHERE s.status = 'BOOKED' " +
                        "AND s.oneHourReminderSent = false " +
                        "AND s.sessionDate = CURRENT_DATE " +
                        "AND s.startTime >= :windowStartTime AND s.startTime <= :windowEndTime")
        List<TherapySession> findSessionsForOneHourReminder(
                        @Param("windowStartTime") LocalTime windowStartTime,
                        @Param("windowEndTime") LocalTime windowEndTime);

        // ================= Completed Sessions Without Earnings (Self-Healing) =================
        @Query("SELECT s FROM TherapySession s WHERE s.practitioner.id = :practitionerId " +
                        "AND s.status = 'COMPLETED' AND s.paymentStatus = 'PAID' " +
                        "AND s.id NOT IN (SELECT e.session.id FROM com.wellness.backend.model.DoctorEarning e WHERE e.practitioner.id = :practitionerId)")
        List<TherapySession> findCompletedSessionsWithoutEarnings(
                        @Param("practitionerId") Integer practitionerId);

        long countByPractitioner_IdAndStatus(Integer practitionerId, SessionStatus status);

    // Analytics
    long countByStatus(SessionStatus status);

    @Query(value = "SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) FROM therapy_session GROUP BY month ORDER BY month", nativeQuery = true)
    List<Object[]> countSessionsGroupedByMonth();

    @Query("SELECT COALESCE(SUM(s.feeAmount), 0) FROM TherapySession s WHERE s.paymentStatus = com.wellness.backend.enums.PaymentStatus.PAID")
    java.math.BigDecimal sumPaidSessionRevenue();
}