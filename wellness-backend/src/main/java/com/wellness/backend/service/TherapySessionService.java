package com.wellness.backend.service;

import com.wellness.backend.dto.TherapySessionDTO;
import com.wellness.backend.dto.BookSessionDTO;
import com.wellness.backend.dto.RescheduleSessionDTO;
import com.wellness.backend.model.*;
import com.wellness.backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;

@Service
public class TherapySessionService {

    @Autowired
    private TherapySessionRepository sessionRepository;
    @Autowired
    private PractitionerAvailabilityRepository availabilityRepository;
    @Autowired
    private PractitionerProfileRepository practitionerRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private SessionNotificationService notificationService;

    // ================= BOOK SESSION =================
    @Transactional
    public TherapySessionDTO bookSession(BookSessionDTO dto, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        PractitionerProfile practitioner = practitionerRepository.findById(dto.getPractitionerId())
                .orElseThrow(() -> new RuntimeException("Practitioner not found"));

        // Get availability slot duration for this day
        PractitionerAvailability.DayOfWeek dayOfWeek = PractitionerAvailability.DayOfWeek
                .valueOf(dto.getSessionDate().getDayOfWeek().name());

        PractitionerAvailability availability = availabilityRepository
                .findByPractitioner_IdAndDayOfWeek(practitioner.getId(), dayOfWeek)
                .orElseThrow(() -> new RuntimeException("Practitioner is not available on this day"));

        if (!availability.getIsAvailable()) {
            throw new RuntimeException("Practitioner is not available on this day");
        }

        int duration = availability.getSlotDuration();
        LocalTime endTime = dto.getStartTime().plusMinutes(duration);

        // Validate slot is within practitioner working hours
        if (dto.getStartTime().isBefore(availability.getStartTime()) ||
                endTime.isAfter(availability.getEndTime())) {
            throw new RuntimeException("Selected time is outside practitioner's working hours");
        }

        // Double-booking check
        if (sessionRepository.existsOverlappingSession(
                practitioner.getId(), dto.getSessionDate(), dto.getStartTime(), endTime)) {
            throw new RuntimeException("This time slot is already booked. Please choose another slot.");
        }

        // Create session
        TherapySession session = new TherapySession();
        session.setPractitioner(practitioner);
        session.setUser(user);
        session.setSessionDate(dto.getSessionDate());
        session.setStartTime(dto.getStartTime());
        session.setEndTime(endTime);
        session.setDuration(duration);
        session.setSessionType(dto.getSessionType() != null ? dto.getSessionType() : TherapySession.SessionType.ONLINE);
        session.setNotes(dto.getNotes());
        session.setStatus(TherapySession.Status.BOOKED);
        session.setPaymentStatus(TherapySession.PaymentStatus.PENDING);

        // Generate meeting link for online sessions
        if (session.getSessionType() == TherapySession.SessionType.ONLINE) {
            session.setMeetingLink("https://meet.wellness.app/session/" + UUID.randomUUID());
        }

        TherapySession saved = sessionRepository.save(session);

        // Notify via WebSocket with structured data
        notificationService.notifySessionBooked(
                user.getId(),
                practitioner.getId(),
                practitioner.getUser().getName(),
                java.time.LocalDateTime.of(dto.getSessionDate(), dto.getStartTime())
        );

        return mapToDTO(saved);
    }

    // ================= CANCEL SESSION =================
    @Transactional
    public TherapySessionDTO cancelSession(Integer sessionId, String cancelledByRole, String reason) {
        TherapySession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));

        if (session.getStatus() == TherapySession.Status.COMPLETED) {
            throw new RuntimeException("Cannot cancel a completed session");
        }
        if (session.getStatus() == TherapySession.Status.CANCELLED) {
            throw new RuntimeException("Session is already cancelled");
        }

        session.setStatus(TherapySession.Status.CANCELLED);
        session.setCancellationReason(reason);
        session.setCancelledBy(TherapySession.CancelledBy.valueOf(cancelledByRole.toUpperCase()));

        // Notify both parties via WebSocket
        notificationService.notifySessionCancelled(
                session.getUser().getId(),
                session.getPractitioner().getId(),
                reason
        );

        return mapToDTO(sessionRepository.save(session));
    }

    // ================= RESCHEDULE SESSION =================
    @Transactional
    public TherapySessionDTO rescheduleSession(Integer sessionId, RescheduleSessionDTO dto) {
        TherapySession oldSession = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));

        if (oldSession.getStatus() != TherapySession.Status.BOOKED) {
            throw new RuntimeException("Only BOOKED sessions can be rescheduled");
        }

        // Validate new slot availability
        LocalTime newEndTime = dto.getNewStartTime().plusMinutes(oldSession.getDuration());
        if (sessionRepository.existsOverlappingSession(
                oldSession.getPractitioner().getId(), dto.getNewSessionDate(),
                dto.getNewStartTime(), newEndTime)) {
            throw new RuntimeException("The new time slot is already booked.");
        }

        // Mark old as rescheduled
        oldSession.setStatus(TherapySession.Status.RESCHEDULED);
        oldSession.setCancellationReason(dto.getReason());
        sessionRepository.save(oldSession);

        // Create new session
        TherapySession newSession = new TherapySession();
        newSession.setPractitioner(oldSession.getPractitioner());
        newSession.setUser(oldSession.getUser());
        newSession.setSessionDate(dto.getNewSessionDate());
        newSession.setStartTime(dto.getNewStartTime());
        newSession.setEndTime(newEndTime);
        newSession.setDuration(oldSession.getDuration());
        newSession.setSessionType(oldSession.getSessionType());
        newSession.setNotes(oldSession.getNotes());
        newSession.setStatus(TherapySession.Status.BOOKED);
        newSession.setPaymentStatus(oldSession.getPaymentStatus());
        if (oldSession.getSessionType() == TherapySession.SessionType.ONLINE) {
            newSession.setMeetingLink("https://meet.wellness.app/session/" + UUID.randomUUID());
        }

        TherapySession saved = sessionRepository.save(newSession);

        notificationService.notifySessionRescheduled(
                oldSession.getUser().getId(),
                oldSession.getPractitioner().getId(),
                java.time.LocalDateTime.of(dto.getNewSessionDate(), dto.getNewStartTime())
        );

        return mapToDTO(saved);
    }

    // ================= GET SESSIONS FOR USER =================
    @Transactional(readOnly = true)
    public List<TherapySessionDTO> getSessionsForUser(Integer userId) {
        return sessionRepository.findByUser_IdOrderBySessionDateAscStartTimeAsc(userId)
                .stream().map(this::mapToDTO).toList();
    }

    // ================= GET SESSIONS FOR PRACTITIONER =================
    @Transactional(readOnly = true)
    public List<TherapySessionDTO> getSessionsForPractitioner(Integer practitionerId) {
        return sessionRepository.findByPractitioner_IdOrderBySessionDateAscStartTimeAsc(practitionerId)
                .stream().map(this::mapToDTO).toList();
    }

    // ================= GET AVAILABLE SLOTS =================
    @Transactional(readOnly = true)
    public List<String> getAvailableSlots(Integer practitionerId, LocalDate date) {
        PractitionerAvailability.DayOfWeek dayOfWeek = PractitionerAvailability.DayOfWeek
                .valueOf(date.getDayOfWeek().name());

        Optional<PractitionerAvailability> availOpt = availabilityRepository
                .findByPractitioner_IdAndDayOfWeek(practitionerId, dayOfWeek);

        if (availOpt.isEmpty() || !availOpt.get().getIsAvailable()) {
            return Collections.emptyList();
        }

        PractitionerAvailability avail = availOpt.get();
        List<TherapySession> booked = sessionRepository.findActiveSessionsByPractitionerAndDate(practitionerId, date);

        // Generate all slots and filter out booked ones
        List<String> slots = new ArrayList<>();
        LocalTime current = avail.getStartTime();
        while (current.plusMinutes(avail.getSlotDuration()).compareTo(avail.getEndTime()) <= 0) {
            LocalTime slotEnd = current.plusMinutes(avail.getSlotDuration());
            final LocalTime slotStart = current;
            boolean isBooked = booked.stream()
                    .anyMatch(s -> s.getStartTime().isBefore(slotEnd) && s.getEndTime().isAfter(slotStart));
            if (!isBooked) {
                slots.add(current.toString());
            }
            current = current.plusMinutes(avail.getSlotDuration());
        }
        return slots;
    }

    // ================= MAP TO DTO =================
    public TherapySessionDTO mapToDTO(TherapySession s) {
        TherapySessionDTO dto = new TherapySessionDTO();
        dto.setId(s.getId());
        dto.setPractitionerId(s.getPractitioner().getId());
        dto.setPractitionerName(
                s.getPractitioner().getUser() != null ? s.getPractitioner().getUser().getName() : "Unknown");
        dto.setUserId(s.getUser().getId());
        dto.setUserName(s.getUser().getName());
        dto.setSessionDate(s.getSessionDate());
        dto.setStartTime(s.getStartTime());
        dto.setEndTime(s.getEndTime());
        dto.setDuration(s.getDuration());
        dto.setSessionType(s.getSessionType());
        dto.setMeetingLink(s.getMeetingLink());
        dto.setStatus(s.getStatus());
        dto.setPaymentStatus(s.getPaymentStatus());
        dto.setNotes(s.getNotes());
        dto.setCancellationReason(s.getCancellationReason());
        dto.setCancelledBy(s.getCancelledBy());
        dto.setCreatedAt(s.getCreatedAt());
        return dto;
    }
}
