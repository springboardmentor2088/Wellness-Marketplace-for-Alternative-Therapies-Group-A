package com.wellness.backend.controller;

import com.wellness.backend.enums.SessionStatus;
import com.wellness.backend.model.DoctorEarning;
import com.wellness.backend.model.PractitionerPayout;
import com.wellness.backend.model.PractitionerProfile;
import com.wellness.backend.model.TherapySession;
import com.wellness.backend.model.User;
import com.wellness.backend.repository.DoctorEarningRepository;
import com.wellness.backend.repository.PractitionerPayoutRepository;
import com.wellness.backend.repository.PractitionerProfileRepository;
import com.wellness.backend.repository.TherapySessionRepository;
import com.wellness.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/practitioner/earnings")
public class DoctorEarningController {

        @Autowired
        private DoctorEarningRepository earningRepository;

        @Autowired
        private PractitionerPayoutRepository payoutRepository;

        @Autowired
        private UserRepository userRepository;

        @Autowired
        private PractitionerProfileRepository profileRepository;

        @Autowired
        private TherapySessionRepository sessionRepository;

        @PreAuthorize("hasRole('PRACTITIONER')")
        @GetMapping("/pending")
        @Transactional
        public ResponseEntity<?> getPendingEarnings(Authentication authentication) {
                User user = userRepository.findByEmail(authentication.getName())
                                .orElseThrow(() -> new RuntimeException("User not found"));

                PractitionerProfile profile = profileRepository.findByUser_Id(user.getId())
                                .orElseThrow(() -> new RuntimeException("Practitioner profile not found"));

                // Self-healing: create DoctorEarning for completed sessions that are missing one
                List<TherapySession> missingSessions = sessionRepository
                                .findCompletedSessionsWithoutEarnings(profile.getId());
                for (TherapySession session : missingSessions) {
                        BigDecimal fee = session.getFeeAmount();
                        if (fee == null) {
                                fee = session.getPractitioner().getConsultationFee() != null
                                        ? session.getPractitioner().getConsultationFee()
                                        : BigDecimal.ZERO;
                        }
                        BigDecimal platformCommission = fee.multiply(new BigDecimal("0.20"));
                        BigDecimal netAmount = fee.subtract(platformCommission);

                        DoctorEarning earning = new DoctorEarning();
                        earning.setPractitioner(session.getPractitioner());
                        earning.setSession(session);
                        earning.setAmount(fee);
                        earning.setPlatformFee(platformCommission);
                        earning.setNetAmount(netAmount);
                        earning.setPayoutStatus(DoctorEarning.PayoutStatus.PENDING);
                        earningRepository.save(earning);
                }

                List<DoctorEarning> pendingEarnings = earningRepository
                                .findByPractitioner_IdAndPayoutStatus(profile.getId(),
                                                DoctorEarning.PayoutStatus.PENDING);

                BigDecimal totalPending = pendingEarnings.stream()
                                .map(DoctorEarning::getNetAmount)
                                .reduce(BigDecimal.ZERO, BigDecimal::add);

                // Count completed sessions from the sessions table (always accurate)
                long totalCompletedSessions = sessionRepository
                                .countByPractitioner_IdAndStatus(profile.getId(), SessionStatus.COMPLETED);

                return ResponseEntity.ok(Map.of(
                                "totalPending", totalPending,
                                "sessionCount", pendingEarnings.size(),
                                "totalCompletedSessions", totalCompletedSessions,
                                "earnings", pendingEarnings));
        }

        @PreAuthorize("hasRole('PRACTITIONER')")
        @PostMapping("/withdraw")
        @Transactional
        public ResponseEntity<?> withdrawEarnings(Authentication authentication) {
                User user = userRepository.findByEmail(authentication.getName())
                                .orElseThrow(() -> new RuntimeException("User not found"));

                PractitionerProfile profile = profileRepository.findByUser_Id(user.getId())
                                .orElseThrow(() -> new RuntimeException("Practitioner profile not found"));

                List<DoctorEarning> pendingEarnings = earningRepository
                                .findByPractitioner_IdAndPayoutStatus(profile.getId(),
                                                DoctorEarning.PayoutStatus.PENDING);

                if (pendingEarnings.isEmpty()) {
                        return ResponseEntity.badRequest().body(Map.of("error", "No pending earnings to withdraw"));
                }

                BigDecimal totalNetAmount = pendingEarnings.stream()
                                .map(DoctorEarning::getNetAmount)
                                .reduce(BigDecimal.ZERO, BigDecimal::add);

                PractitionerPayout payout = new PractitionerPayout();
                payout.setPractitioner(profile);

                LocalDate today = LocalDate.now();
                payout.setMonthYear(today.getYear() + "-" + String.format("%02d", today.getMonthValue()));
                payout.setTotalSessions(pendingEarnings.size());
                payout.setAmount(totalNetAmount);
                payout.setStatus(PractitionerPayout.PayoutStatus.PENDING);

                payoutRepository.save(payout);

                pendingEarnings.forEach(e -> e.setPayoutStatus(DoctorEarning.PayoutStatus.PAID));
                earningRepository.saveAll(pendingEarnings);

                return ResponseEntity.ok(Map.of(
                                "message", "Withdrawal requested successfully",
                                "amountRequested", totalNetAmount));
        }
}
