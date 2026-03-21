package com.wellness.backend.repository;

import com.wellness.backend.model.PractitionerPayout;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PractitionerPayoutRepository extends JpaRepository<PractitionerPayout, Integer> {
    Optional<PractitionerPayout> findByPractitionerIdAndMonthYear(Integer practitionerId, String monthYear);

    List<PractitionerPayout> findByPractitionerIdOrderByCreatedAtDesc(Integer practitionerId);
}
