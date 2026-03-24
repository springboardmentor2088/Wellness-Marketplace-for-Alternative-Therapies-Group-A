package com.wellness.backend.repository;

import com.wellness.backend.model.DoctorEarning;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface DoctorEarningRepository extends JpaRepository<DoctorEarning, Integer> {
    List<DoctorEarning> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    List<DoctorEarning> findByPractitioner_IdAndPayoutStatus(Integer practitionerId, DoctorEarning.PayoutStatus status);

    long countByPractitioner_Id(Integer practitionerId);

    java.util.Optional<DoctorEarning> findBySession_Id(Integer sessionId);
}
