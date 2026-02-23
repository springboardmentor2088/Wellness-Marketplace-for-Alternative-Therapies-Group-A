package com.wellness.backend.service;

import com.wellness.backend.dto.PractitionerRequestDTO;
import com.wellness.backend.model.PractitionerProfile;
import com.wellness.backend.model.PractitionerRequest;
import com.wellness.backend.model.User;
import com.wellness.backend.repository.PractitionerProfileRepository;
import com.wellness.backend.repository.PractitionerRequestRepository;
import com.wellness.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class PractitionerRequestService {

    private final PractitionerRequestRepository requestRepository;
    private final PractitionerProfileRepository practitionerRepository;
    private final UserRepository userRepository;

    @Autowired
    public PractitionerRequestService(PractitionerRequestRepository requestRepository,
                                      PractitionerProfileRepository practitionerRepository,
                                      UserRepository userRepository) {
        this.requestRepository = requestRepository;
        this.practitionerRepository = practitionerRepository;
        this.userRepository = userRepository;
    }

    // ================= GET ALL REQUESTS (FOR ADMIN) =================
    @Transactional(readOnly = true)
    public List<PractitionerRequestDTO> getAllRequests() {
        List<PractitionerRequest> requests = requestRepository.findAllOrderByCreatedAtDesc();
        return requests.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    // ================= GET REQUESTS FOR PRACTITIONER (LATEST FIRST) =================
    @Transactional(readOnly = true)
    public List<PractitionerRequestDTO> getRequestsForPractitioner(Integer practitionerId) {
        List<PractitionerRequest> requests = requestRepository.findByPractitionerId(practitionerId);
        return requests.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    // ================= GET PENDING REQUESTS FOR PRACTITIONER (LATEST FIRST) =================
    @Transactional(readOnly = true)
    public List<PractitionerRequestDTO> getPendingRequestsForPractitioner(Integer practitionerId) {
        List<PractitionerRequest> requests = requestRepository.findPendingByPractitionerId(practitionerId);
        return requests.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    // ================= GET REQUESTS BY STATUS =================
    @Transactional(readOnly = true)
    public List<PractitionerRequestDTO> getRequestsByStatus(Integer practitionerId, String status) {
        try {
            PractitionerRequest.Status statusEnum = PractitionerRequest.Status.valueOf(status.toUpperCase());
            List<PractitionerRequest> requests = requestRepository.findByPractitionerIdAndStatus(
                    practitionerId, statusEnum.toString());
            return requests.stream()
                    .map(this::convertToDTO)
                    .collect(Collectors.toList());
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Invalid status: " + status);
        }
    }

    // ================= GET REQUESTS BY PRIORITY =================
    @Transactional(readOnly = true)
    public List<PractitionerRequestDTO> getRequestsByPriority(Integer practitionerId, String priority) {
        try {
            PractitionerRequest.Priority priorityEnum = PractitionerRequest.Priority.valueOf(priority.toUpperCase());
            List<PractitionerRequest> requests = requestRepository.findByPractitionerIdAndPriority(
                    practitionerId, priorityEnum.toString());
            return requests.stream()
                    .map(this::convertToDTO)
                    .collect(Collectors.toList());
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Invalid priority: " + priority);
        }
    }

    // ================= GET REQUEST BY ID =================
    @Transactional(readOnly = true)
    public PractitionerRequestDTO getRequestById(Integer requestId) {
        PractitionerRequest request = requestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found with id: " + requestId));
        return convertToDTO(request);
    }

    // ================= CREATE REQUEST (PATIENT ONLY) =================
    @Transactional
    public PractitionerRequestDTO createRequest(Integer practitionerId, PractitionerRequest request) {
        PractitionerProfile practitioner = practitionerRepository.findById(practitionerId)
                .orElseThrow(() -> new RuntimeException("Practitioner not found with id: " + practitionerId));

        request.setPractitioner(practitioner);
        request.setStatus(PractitionerRequest.Status.PENDING);

        if (request.getPriority() == null) {
            request.setPriority(PractitionerRequest.Priority.NORMAL);
        }

        PractitionerRequest savedRequest = requestRepository.save(request);
        return convertToDTO(savedRequest);
    }

    // ================= ACCEPT REQUEST (PRACTITIONER ONLY) =================
    @Transactional
    public PractitionerRequestDTO acceptRequest(Integer requestId) {
        PractitionerRequest request = requestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found with id: " + requestId));

        request.setStatus(PractitionerRequest.Status.ACCEPTED);
        PractitionerRequest updatedRequest = requestRepository.save(request);
        return convertToDTO(updatedRequest);
    }

    // ================= REJECT REQUEST (PRACTITIONER ONLY) =================
    @Transactional
    public PractitionerRequestDTO rejectRequest(Integer requestId, String reason) {
        PractitionerRequest request = requestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found with id: " + requestId));

        request.setStatus(PractitionerRequest.Status.REJECTED);
        if (reason != null && !reason.isEmpty()) {
            request.setDescription(request.getDescription() + " [Rejection Reason: " + reason + "]");
        }
        PractitionerRequest updatedRequest = requestRepository.save(request);
        return convertToDTO(updatedRequest);
    }

    // ================= COMPLETE REQUEST (PRACTITIONER ONLY) =================
    @Transactional
    public PractitionerRequestDTO completeRequest(Integer requestId) {
        PractitionerRequest request = requestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found with id: " + requestId));

        request.setStatus(PractitionerRequest.Status.COMPLETED);
        PractitionerRequest updatedRequest = requestRepository.save(request);
        return convertToDTO(updatedRequest);
    }

    // ================= CANCEL REQUEST =================
    @Transactional
    public PractitionerRequestDTO cancelRequest(Integer requestId) {
        PractitionerRequest request = requestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found with id: " + requestId));

        request.setStatus(PractitionerRequest.Status.CANCELLED);
        PractitionerRequest updatedRequest = requestRepository.save(request);
        return convertToDTO(updatedRequest);
    }

    // ================= COUNT PENDING REQUESTS =================
    @Transactional(readOnly = true)
    public long countPendingRequests(Integer practitionerId) {
        return requestRepository.countPendingByPractitionerId(practitionerId);
    }

    // ================= HELPER METHOD TO CONVERT TO DTO =================
    private PractitionerRequestDTO convertToDTO(PractitionerRequest request) {
        if (request == null) {
            return null;
        }

        PractitionerRequestDTO dto = new PractitionerRequestDTO();
        dto.setId(request.getId());
        dto.setDescription(request.getDescription());
        dto.setStatus(request.getStatus().toString());
        dto.setPriority(request.getPriority().toString());
        dto.setCreatedAt(request.getCreatedAt());
        dto.setUpdatedAt(request.getUpdatedAt());
        dto.setRequestedDate(request.getRequestedDate());

        if (request.getPractitioner() != null) {
            dto.setPractitionerId(request.getPractitioner().getId());
            if (request.getPractitioner().getUser() != null) {
                dto.setPractitionerName(request.getPractitioner().getUser().getName());
                dto.setPractitionerEmail(request.getPractitioner().getUser().getEmail());
            }
        }

        if (request.getUser() != null) {
            dto.setUserId(request.getUser().getId());
            dto.setUserName(request.getUser().getName());
            dto.setUserEmail(request.getUser().getEmail());
        }

        return dto;
    }
}
