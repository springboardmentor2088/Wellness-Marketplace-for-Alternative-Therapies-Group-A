package com.wellness.backend.repository;

import com.wellness.backend.model.PractitionerAvailability;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PractitionerAvailabilityRepository extends JpaRepository<PractitionerAvailability, Integer> {

    List<PractitionerAvailability> findByPractitioner_Id(Integer practitionerId);

    Optional<PractitionerAvailability> findByPractitioner_IdAndDayOfWeek(
            Integer practitionerId, PractitionerAvailability.DayOfWeek dayOfWeek);
}
