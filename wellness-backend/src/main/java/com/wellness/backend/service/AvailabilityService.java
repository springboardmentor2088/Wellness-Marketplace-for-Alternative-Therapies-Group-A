package com.wellness.backend.service;

import com.wellness.backend.dto.AvailabilityDTO;
import com.wellness.backend.dto.SetAvailabilityDTO;
import com.wellness.backend.model.PractitionerAvailability;
import com.wellness.backend.model.PractitionerProfile;
import com.wellness.backend.repository.PractitionerAvailabilityRepository;
import com.wellness.backend.repository.PractitionerProfileRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class AvailabilityService {

    @Autowired
    private PractitionerAvailabilityRepository availabilityRepository;
    @Autowired
    private PractitionerProfileRepository practitionerRepository;

    // ================= SET / UPDATE AVAILABILITY =================
    @Transactional
    public AvailabilityDTO setAvailability(Integer practitionerId, SetAvailabilityDTO dto) {
        PractitionerProfile practitioner = practitionerRepository.findById(practitionerId)
                .orElseThrow(() -> new RuntimeException("Practitioner not found"));

        if (dto.getEndTime().isBefore(dto.getStartTime()) ||
                dto.getEndTime().equals(dto.getStartTime())) {
            throw new RuntimeException("End time must be after start time");
        }

        // Upsert: update if exists for that day, else create
        PractitionerAvailability avail = availabilityRepository
                .findByPractitioner_IdAndDayOfWeek(practitionerId, dto.getDayOfWeek())
                .orElse(new PractitionerAvailability());

        avail.setPractitioner(practitioner);
        avail.setDayOfWeek(dto.getDayOfWeek());
        avail.setStartTime(dto.getStartTime());
        avail.setEndTime(dto.getEndTime());
        avail.setSlotDuration(dto.getSlotDuration() != null ? dto.getSlotDuration() : 60);
        avail.setIsAvailable(dto.getIsAvailable() != null ? dto.getIsAvailable() : true);

        return mapToDTO(availabilityRepository.save(avail));
    }

    // ================= GET AVAILABILITY =================
    @Transactional(readOnly = true)
    public List<AvailabilityDTO> getAvailability(Integer practitionerId) {
        return availabilityRepository.findByPractitioner_Id(practitionerId)
                .stream().map(this::mapToDTO).toList();
    }

    // ================= MAP TO DTO =================
    public AvailabilityDTO mapToDTO(PractitionerAvailability a) {
        AvailabilityDTO dto = new AvailabilityDTO();
        dto.setId(a.getId());
        dto.setPractitionerId(a.getPractitioner().getId());
        dto.setDayOfWeek(a.getDayOfWeek());
        dto.setStartTime(a.getStartTime());
        dto.setEndTime(a.getEndTime());
        dto.setSlotDuration(a.getSlotDuration());
        dto.setIsAvailable(a.getIsAvailable());
        return dto;
    }
}
