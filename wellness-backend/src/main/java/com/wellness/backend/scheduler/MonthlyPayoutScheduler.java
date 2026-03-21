package com.wellness.backend.scheduler;

import com.wellness.backend.model.DoctorEarning;
import com.wellness.backend.model.PractitionerPayout;
import com.wellness.backend.repository.DoctorEarningRepository;
import com.wellness.backend.repository.PractitionerPayoutRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Component
public class MonthlyPayoutScheduler {

    private static final Logger logger = LoggerFactory.getLogger(MonthlyPayoutScheduler.class);

    @Autowired
    private DoctorEarningRepository earningRepository;

    @Autowired
    private PractitionerPayoutRepository payoutRepository;

    /**
     * Runs on the 1st of every month at midnight to aggregate earnings for the
     * previous month.
     * Cron expression: 0 0 0 1 * ?
     */
    @Scheduled(cron = "0 0 0 1 * ?")
    @Transactional
    public void generateMonthlyPayouts() {
        LocalDate today = LocalDate.now();
        LocalDate firstDayOfLastMonth = today.minusMonths(1).withDayOfMonth(1);
        LocalDate lastDayOfLastMonth = today.minusMonths(1).withDayOfMonth(today.minusMonths(1).lengthOfMonth());

        LocalDateTime start = firstDayOfLastMonth.atStartOfDay();
        LocalDateTime end = lastDayOfLastMonth.atTime(LocalTime.MAX);
        String monthYear = firstDayOfLastMonth.getYear() + "-"
                + String.format("%02d", firstDayOfLastMonth.getMonthValue());

        logger.info("Generating payouts for {}", monthYear);

        List<DoctorEarning> earnings = earningRepository.findByCreatedAtBetween(start, end);

        Map<Integer, List<DoctorEarning>> earningsByPractitioner = earnings.stream()
                .collect(Collectors.groupingBy(e -> e.getPractitioner().getId()));

        int count = 0;
        for (Map.Entry<Integer, List<DoctorEarning>> entry : earningsByPractitioner.entrySet()) {
            Integer practitionerId = entry.getKey();
            List<DoctorEarning> practEarnings = entry.getValue();

            // Filter for only PENDING earnings (just in case)
            List<DoctorEarning> pendingEarnings = practEarnings.stream()
                    .filter(e -> e.getPayoutStatus() == DoctorEarning.PayoutStatus.PENDING)
                    .collect(Collectors.toList());

            if (pendingEarnings.isEmpty())
                continue;

            BigDecimal totalNetAmount = pendingEarnings.stream()
                    .map(DoctorEarning::getNetAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            PractitionerPayout payout = new PractitionerPayout();
            payout.setPractitioner(pendingEarnings.get(0).getPractitioner());
            payout.setMonthYear(monthYear);
            payout.setTotalSessions(pendingEarnings.size());
            payout.setAmount(totalNetAmount);
            payout.setStatus(PractitionerPayout.PayoutStatus.PENDING); // Payout itself is pending until disbursed via
                                                                       // bank
            payoutRepository.save(payout);

            // Mark earnings as PAID
            pendingEarnings.forEach(e -> e.setPayoutStatus(DoctorEarning.PayoutStatus.PAID));
            earningRepository.saveAll(pendingEarnings);

            count++;
        }

        logger.info("Generated {} payout records for {}", count, monthYear);
    }
}
