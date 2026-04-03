package com.wellness.backend.repository;

import com.wellness.backend.model.DoctorEarning;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface DoctorEarningRepository extends JpaRepository<DoctorEarning, Integer> {
    List<DoctorEarning> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    List<DoctorEarning> findByPractitioner_IdAndPayoutStatus(Integer practitionerId, DoctorEarning.PayoutStatus status);

    long countByPractitioner_Id(Integer practitionerId);

    java.util.Optional<DoctorEarning> findBySession_Id(Integer sessionId);

    // Analytics
    @Query("SELECT COALESCE(SUM(e.platformFee), 0) FROM DoctorEarning e")
    BigDecimal sumTotalPlatformFees();

    @Query("SELECT e.practitioner.id, e.practitioner.user.name, e.practitioner.specialization, COUNT(e), COALESCE(SUM(e.amount), 0) " +
           "FROM DoctorEarning e GROUP BY e.practitioner.id, e.practitioner.user.name, e.practitioner.specialization " +
           "ORDER BY SUM(e.amount) DESC")
    List<Object[]> findTopEarningPractitioners(Pageable pageable);
}
