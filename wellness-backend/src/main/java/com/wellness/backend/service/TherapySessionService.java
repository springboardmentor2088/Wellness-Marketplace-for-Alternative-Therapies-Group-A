package com.wellness.backend.service;

import com.wellness.backend.dto.TherapySessionDTO;
import com.wellness.backend.dto.BookSessionDTO;
import com.wellness.backend.dto.RescheduleSessionDTO;
import com.wellness.backend.enums.PaymentStatus;
import com.wellness.backend.enums.SessionStatus;
import com.wellness.backend.enums.SessionType;
import com.wellness.backend.model.*;
import com.wellness.backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.net.MalformedURLException;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;

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
    @Autowired
    private RefundService refundService;
    @Autowired
    private AuditLogService auditLogService;
    @Autowired
    private DoctorEarningRepository doctorEarningRepository;
    @Autowired
    private ReviewRepository reviewRepository;

    // ================= BOOK SESSION =================
    @Transactional
    public TherapySessionDTO bookSession(BookSessionDTO dto, String userEmail) {

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        PractitionerProfile practitioner = practitionerRepository.findById(dto.getPractitionerId())
                .orElseThrow(() -> new RuntimeException("Practitioner not found"));

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

        if (dto.getStartTime().isBefore(availability.getStartTime()) ||
                endTime.isAfter(availability.getEndTime())) {
            throw new RuntimeException("Selected time is outside practitioner's working hours");
        }

        // Practitioner overlap check
        if (sessionRepository.existsOverlappingSession(
                practitioner.getId(), dto.getSessionDate(), dto.getStartTime(), endTime)) {
            throw new RuntimeException("This time slot is already booked. Please choose another slot.");
        }

        // User overlap check
        if (sessionRepository.existsUserOverlappingSession(
                user.getId(), dto.getSessionDate(), dto.getStartTime(), endTime)) {
            throw new RuntimeException("You already have another session at this time.");
        }

        TherapySession session = new TherapySession();

        session.setPractitioner(practitioner);
        session.setUser(user);
        session.setSessionDate(dto.getSessionDate());
        session.setStartTime(dto.getStartTime());
        session.setEndTime(endTime);
        session.setDuration(duration);
        session.setSessionType(dto.getSessionType() != null
                ? dto.getSessionType()
                : SessionType.ONLINE);
        session.setNotes(dto.getNotes());
        session.setStatus(SessionStatus.HOLD);
        session.setPaymentStatus(PaymentStatus.PENDING);
        java.math.BigDecimal consultationFee = practitioner.getConsultationFee();
        session.setFeeAmount(consultationFee != null ? consultationFee : java.math.BigDecimal.ZERO);
        session.setCancellationReason(null);
        session.setCancelledBy(null);

        if (session.getSessionType() == SessionType.ONLINE) {
            String uniqueRoomName = "WellnessSession-" + UUID.randomUUID().toString().replace("-", "");
            session.setMeetingLink("https://meet.jit.si/" + uniqueRoomName);
        }

        TherapySession saved = sessionRepository.save(session);
        return mapToDTO(saved);
    }

    // ================= CANCEL SESSION =================
    @Transactional
    public TherapySessionDTO cancelSession(Integer sessionId, String cancelledBy, String reason) {
        TherapySession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));

        if (session.getStatus() == SessionStatus.CANCELLED) {
            throw new RuntimeException("Session is already cancelled");
        }

        if (session.getStatus() == SessionStatus.COMPLETED) {
            throw new RuntimeException("Cannot cancel a completed session");
        }

        // Determine CancelledBy enum
        TherapySession.CancelledBy cancelledByEnum;
        try {
            cancelledByEnum = TherapySession.CancelledBy.valueOf(cancelledBy.toUpperCase());
        } catch (IllegalArgumentException e) {
            cancelledByEnum = TherapySession.CancelledBy.USER;
        }

        // Process Refund before changing status
        if (session.getPaymentStatus() == PaymentStatus.PAID) {
            refundService.initiateRefund(session, cancelledByEnum, reason);
        }

        session.setStatus(SessionStatus.CANCELLED);
        session.setCancellationReason(reason);
        session.setCancelledBy(cancelledByEnum);
        TherapySession saved = sessionRepository.save(session);

        // Notify
        notificationService.notifySessionCancelled(
                session.getUser().getId(),
                session.getUser().getName(),
                session.getUser().getEmail(),
                session.getPractitioner().getId(),
                session.getPractitioner().getUser().getName(),
                reason,
                cancelledBy);

        auditLogService.logAction(
                session.getUser().getId(),
                "SESSION_CANCELLED",
                "TherapySession",
                session.getId().toString(),
                "Reason: " + reason);

        return mapToDTO(saved);
    }

    // ================= ACCEPT SESSION (For Practitioners) =================
    @Transactional
    public TherapySessionDTO acceptSession(Integer sessionId, Integer practitionerId) {
        TherapySession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));

        if (!session.getPractitioner().getId().equals(practitionerId)) {
            throw new RuntimeException("You are not authorized for this session");
        }

        if (session.getStatus() != SessionStatus.HOLD) {
            throw new RuntimeException("Only sessions on HOLD can be accepted");
        }

        session.setStatus(SessionStatus.BOOKED);
        TherapySession saved = sessionRepository.save(session);

        notificationService.notifySessionAccepted(
                session.getUser().getId(),
                session.getPractitioner().getUser().getName(),
                session.getSessionDate(),
                session.getStartTime());

        return mapToDTO(saved);
    }

    // ================= COMPLETE SESSION =================
    @Transactional
    public TherapySessionDTO completeSession(Integer sessionId, Integer practitionerId, MultipartFile file) {
        TherapySession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));

        if (!session.getPractitioner().getId().equals(practitionerId)) {
            throw new RuntimeException("You are not authorized for this session");
        }

        if (session.getStatus() != SessionStatus.BOOKED) {
            throw new RuntimeException("Only BOOKED sessions can be marked as completed");
        }

        // Handle file upload if provided
        if (file != null && !file.isEmpty()) {
            try {
                String fileName = "prescription_" + sessionId + "_" + System.currentTimeMillis() + "_" + file.getOriginalFilename();
                Path uploadPath = Paths.get("uploads/prescriptions");
                if (!Files.exists(uploadPath)) {
                    Files.createDirectories(uploadPath);
                }
                Path filePath = uploadPath.resolve(fileName);
                Files.copy(file.getInputStream(), filePath);
                session.setPrescriptionPath(fileName);
            } catch (IOException e) {
                throw new RuntimeException("Failed to upload prescription file", e);
            }
        }

        session.setStatus(SessionStatus.COMPLETED);
        TherapySession saved = sessionRepository.save(session);

        // Notify
        notificationService.notifySessionCompleted(
                session.getUser().getId(),
                session.getPractitioner().getId()
        );

        auditLogService.logAction(
                session.getPractitioner().getUser().getId(),
                "SESSION_COMPLETED",
                "TherapySession",
                session.getId().toString(),
                "Session marked as completed");

        return mapToDTO(saved);
    }

    // ================= GET SESSIONS FOR USER (by userId) =================
    @Transactional(readOnly = true)
    public List<TherapySessionDTO> getSessionsForUser(Integer userId) {
        return sessionRepository.findByUser_IdOrderBySessionDateAscStartTimeAsc(userId)
                .stream()
                .map(this::mapToDTO)
                .toList();
    }

    // ================= GET ALL SESSIONS =================
    @Transactional(readOnly = true)
    public List<TherapySessionDTO> getAllSessions() {
        return sessionRepository.findAllByOrderBySessionDateDescStartTimeDesc()
                .stream()
                .map(this::mapToDTO)
                .toList();
    }

    // ================= GET SESSIONS FOR PRACTITIONER (by practitionerId) =================
    @Transactional(readOnly = true)
    public List<TherapySessionDTO> getSessionsForPractitioner(Integer practitionerId) {
        return sessionRepository.findByPractitioner_IdOrderBySessionDateAscStartTimeAsc(practitionerId)
                .stream()
                .map(this::mapToDTO)
                .toList();
    }

    // ================= GET AVAILABLE SLOTS =================
    @Transactional(readOnly = true)
    public List<String> getAvailableSlots(Integer practitionerId, LocalDate date) {
        PractitionerAvailability.DayOfWeek dayOfWeek = PractitionerAvailability.DayOfWeek
                .valueOf(date.getDayOfWeek().name());

        PractitionerAvailability availability = availabilityRepository
                .findByPractitioner_IdAndDayOfWeek(practitionerId, dayOfWeek)
                .orElse(null);

        if (availability == null || !availability.getIsAvailable()) {
            return Collections.emptyList();
        }

        int slotDuration = availability.getSlotDuration();
        LocalTime start = availability.getStartTime();
        LocalTime end = availability.getEndTime();

        // Get existing booked sessions for this practitioner on this date
        List<TherapySession> bookedSessions = sessionRepository
                .findActiveSessionsByPractitionerAndDate(practitionerId, date);

        List<String> slots = new ArrayList<>();
        LocalTime current = start;
        while (current.plusMinutes(slotDuration).compareTo(end) <= 0) {
            LocalTime slotEnd = current.plusMinutes(slotDuration);
            LocalTime slotStart = current;

            boolean isBooked = bookedSessions.stream().anyMatch(s ->
                    s.getStartTime().isBefore(slotEnd) && s.getEndTime().isAfter(slotStart));

            if (!isBooked) {
                slots.add(current.toString());
            }
            current = slotEnd;
        }

        return slots;
    }

    // ================= DOWNLOAD SESSION DOCUMENT =================
    public ResponseEntity<Resource> downloadSessionDocument(Integer sessionId) {
        TherapySession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));

        if (session.getPrescribedDocumentUrl() == null) {
            throw new RuntimeException("No document found for this session");
        }

        try {
            Path filePath = Paths.get("uploads/prescriptions").resolve(session.getPrescribedDocumentUrl());
            Resource resource = new UrlResource(filePath.toUri());

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + resource.getFilename() + "\"")
                    .body(resource);
        } catch (MalformedURLException e) {
            throw new RuntimeException("Error loading file", e);
        }
    }

    // ================= GET USER SESSIONS (by email — legacy) =================
    @Transactional(readOnly = true)
    public List<TherapySessionDTO> getUserSessions(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return sessionRepository.findByUser_IdOrderBySessionDateAscStartTimeAsc(user.getId())
                .stream()
                .map(this::mapToDTO)
                .toList();
    }

    // ================= GET PRACTITIONER SESSIONS (by email — legacy) =================
    @Transactional(readOnly = true)
    public List<TherapySessionDTO> getPractitionerSessions(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        PractitionerProfile profile = practitionerRepository.findByUser_Id(user.getId())
                .orElseThrow(() -> new RuntimeException("Practitioner profile not found"));

        return sessionRepository.findByPractitioner_IdOrderBySessionDateAscStartTimeAsc(profile.getId())
                .stream()
                .map(this::mapToDTO)
                .toList();
    }

    // ================= RESCHEDULE =================
    @Transactional
    public TherapySessionDTO rescheduleSession(Integer sessionId, RescheduleSessionDTO dto, String userEmail) {
        TherapySession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));

        if (!session.getUser().getEmail().equals(userEmail)) {
            throw new RuntimeException("Not authorized");
        }

        session.setSessionDate(dto.getNewDate());
        session.setStartTime(dto.getNewStartTime());
        session.setEndTime(dto.getNewStartTime().plusMinutes(session.getDuration()));

        return mapToDTO(sessionRepository.save(session));
    }

    // ================= MAPPING =================
    public TherapySessionDTO mapToDTO(TherapySession session) {
        TherapySessionDTO dto = new TherapySessionDTO();
        dto.setId(session.getId());
        dto.setPractitionerId(session.getPractitioner().getId());
        dto.setPractitionerName(session.getPractitioner().getUser().getName());
        dto.setUserId(session.getUser().getId());
        dto.setUserName(session.getUser().getName());
        dto.setSessionDate(session.getSessionDate());
        dto.setStartTime(session.getStartTime());
        dto.setEndTime(session.getEndTime());
        dto.setDuration(session.getDuration());
        dto.setSessionType(session.getSessionType());
        dto.setStatus(session.getStatus());
        dto.setPaymentStatus(session.getPaymentStatus());
        dto.setMeetingLink(session.getMeetingLink());
        dto.setNotes(session.getNotes());
        dto.setFeeAmount(session.getFeeAmount());
        dto.setPrescriptionPath(session.getPrescriptionPath());
        dto.setPrescribedDocumentUrl(session.getPrescribedDocumentUrl());
        // dto.setReviewed(reviewRepository.existsByUser_IdAndPractitioner_Id(
        //         session.getUser().getId(), session.getPractitioner().getId()));
        dto.setReviewed(reviewRepository.existsBySession_Id(session.getId()));
        return dto;
    }

    @Transactional
    public void uploadPrescription(Integer sessionId, MultipartFile file, String practitionerEmail) throws IOException {
        TherapySession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));

        if (!session.getPractitioner().getUser().getEmail().equals(practitionerEmail)) {
            throw new RuntimeException("Not authorized");
        }

        String fileName = "prescription_" + sessionId + "_" + System.currentTimeMillis() + "_" + file.getOriginalFilename();
        Path uploadPath = Paths.get("uploads/prescriptions");
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        Path filePath = uploadPath.resolve(fileName);
        Files.copy(file.getInputStream(), filePath);

        session.setPrescriptionPath(fileName);
        sessionRepository.save(session);
    }

    public ResponseEntity<Resource> downloadPrescription(Integer sessionId, String userEmail) throws MalformedURLException {
        TherapySession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));

        if (!session.getUser().getEmail().equals(userEmail) && 
            !session.getPractitioner().getUser().getEmail().equals(userEmail)) {
            throw new RuntimeException("Not authorized to download this prescription");
        }

        if (session.getPrescriptionPath() == null) {
            throw new RuntimeException("No prescription found for this session");
        }

        Path filePath = Paths.get("uploads/prescriptions").resolve(session.getPrescriptionPath());
        Resource resource = new UrlResource(filePath.toUri());

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + resource.getFilename() + "\"")
                .body(resource);
    }
}
