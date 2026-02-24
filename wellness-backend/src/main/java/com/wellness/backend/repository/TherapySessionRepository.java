package com.wellness.backend.repository;

import com.wellness.backend.model.TherapySession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Repository
public interface TherapySessionRepository extends JpaRepository<TherapySession, Integer> {

    List<TherapySession> findByUser_IdOrderBySessionDateAscStartTimeAsc(Integer userId);

    List<TherapySession> findByPractitioner_IdOrderBySessionDateAscStartTimeAsc(Integer practitionerId);

    // Check for overlapping sessions (double-booking prevention)
    @Query("SELECT COUNT(s) > 0 FROM TherapySession s " +
            "WHERE s.practitioner.id = :practitionerId " +
            "AND s.sessionDate = :sessionDate " +
            "AND s.status NOT IN ('CANCELLED', 'RESCHEDULED') " +
            "AND s.startTime < :endTime AND s.endTime > :startTime")
    boolean existsOverlappingSession(@Param("practitionerId") Integer practitionerId,
            @Param("sessionDate") LocalDate sessionDate,
            @Param("startTime") LocalTime startTime,
            @Param("endTime") LocalTime endTime);

    // Get booked slots for a practitioner on a specific date
    @Query("SELECT s FROM TherapySession s WHERE s.practitioner.id = :practitionerId " +
            "AND s.sessionDate = :sessionDate " +
            "AND s.status NOT IN ('CANCELLED', 'RESCHEDULED')")
    List<TherapySession> findActiveSessionsByPractitionerAndDate(
            @Param("practitionerId") Integer practitionerId,
            @Param("sessionDate") LocalDate sessionDate);

    // Find sessions needing 15-minute reminder
    @Query("SELECT s FROM TherapySession s " +
            "WHERE s.status = 'BOOKED' " +
            "AND s.reminderSent = false " +
            "AND s.sessionDate = CURRENT_DATE " +
            "AND s.startTime >= :nowTime AND s.startTime <= :reminderTime")
    List<TherapySession> findSessionsForReminder(
            @Param("nowTime") LocalTime nowTime,
            @Param("reminderTime") LocalTime reminderTime);

    // Find sessions needing 1-hour reminder
    @Query("SELECT s FROM TherapySession s " +
            "WHERE s.status = 'BOOKED' " +
            "AND s.oneHourReminderSent = false " +
            "AND s.sessionDate = CURRENT_DATE " +
            "AND s.startTime >= :windowStartTime AND s.startTime <= :windowEndTime")
    List<TherapySession> findSessionsForOneHourReminder(
            @Param("windowStartTime") LocalTime windowStartTime,
            @Param("windowEndTime") LocalTime windowEndTime);
}

