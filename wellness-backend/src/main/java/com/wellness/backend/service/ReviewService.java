package com.wellness.backend.service;

import com.wellness.backend.dto.CreateReviewDTO;
import com.wellness.backend.dto.ReviewDTO;
import com.wellness.backend.enums.SessionStatus;
import com.wellness.backend.model.PractitionerProfile;
import com.wellness.backend.model.Review;
import com.wellness.backend.model.TherapySession;
import com.wellness.backend.model.User;
import com.wellness.backend.repository.PractitionerProfileRepository;
import com.wellness.backend.repository.ReviewRepository;
import com.wellness.backend.repository.TherapySessionRepository;
import com.wellness.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class ReviewService {

    @Autowired
    private ReviewRepository reviewRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PractitionerProfileRepository practitionerProfileRepository;

    @Autowired
    private TherapySessionRepository therapySessionRepository;

    @Transactional
    public ReviewDTO createReview(CreateReviewDTO dto, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        PractitionerProfile practitioner = practitionerProfileRepository.findById(dto.getPractitionerId())
                .orElseThrow(() -> new RuntimeException("Practitioner not found"));

        if (dto.getSessionId() != null && reviewRepository.existsBySession_Id(dto.getSessionId())) {
            throw new RuntimeException("You have already reviewed this session");
        }

        List<TherapySession> userSessions = therapySessionRepository
                .findByUser_IdOrderBySessionDateAscStartTimeAsc(user.getId());

        boolean hasCompletedSession = userSessions.stream()
                .anyMatch(session ->
                        session.getPractitioner().getId().equals(practitioner.getId())
                        && session.getStatus() == SessionStatus.COMPLETED
                );

        if (!hasCompletedSession) {
            throw new RuntimeException("You can only review a practitioner after completing a therapy session with them");
        }

        Review review = new Review();
        review.setUser(user);
        review.setPractitioner(practitioner);
        review.setRating(dto.getRating());
        review.setBehaviourRating(dto.getBehaviourRating());
        review.setTreatmentEffectivenessRating(dto.getTreatmentEffectivenessRating());
        review.setRecommendPractitioner(dto.getRecommendPractitioner());
        review.setComment(dto.getComment());

        // Link session if sessionId is provided
        if (dto.getSessionId() != null) {
            TherapySession session = therapySessionRepository.findById(dto.getSessionId())
                    .orElse(null);
            review.setSession(session);
        }

        Review saved = reviewRepository.save(review);
        updatePractitionerRating(practitioner.getId());

        return mapToDTO(saved);
    }

    @Transactional(readOnly = true)
    public List<ReviewDTO> getReviewsByPractitioner(Integer practitionerId) {
        if (!practitionerProfileRepository.existsById(practitionerId)) {
            throw new RuntimeException("Practitioner not found");
        }

        return reviewRepository.findByPractitioner_IdOrderByCreatedAtDesc(practitionerId)
                .stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    private void updatePractitionerRating(Integer practitionerId) {
        Double avgRating = reviewRepository.findAverageRatingByPractitionerId(practitionerId);
        PractitionerProfile practitioner = practitionerProfileRepository.findById(practitionerId)
                .orElseThrow(() -> new RuntimeException("Practitioner not found"));

        if (avgRating != null) {
            practitioner.setRating(Math.round(avgRating * 10.0f) / 10.0f);
        } else {
            practitioner.setRating(0.0f);
        }

        practitionerProfileRepository.save(practitioner);
    }

    private ReviewDTO mapToDTO(Review review) {
        ReviewDTO dto = new ReviewDTO();
        dto.setId(review.getId());
        dto.setUserId(review.getUser().getId());
        dto.setUserName(review.getUser().getName());
        dto.setPractitionerId(review.getPractitioner().getId());
        dto.setPractitionerName(review.getPractitioner().getUser().getName());
        dto.setRating(review.getRating());
        dto.setBehaviourRating(review.getBehaviourRating());
        dto.setTreatmentEffectivenessRating(review.getTreatmentEffectivenessRating());
        dto.setRecommendPractitioner(review.getRecommendPractitioner());
        dto.setComment(review.getComment());
        dto.setCreatedAt(review.getCreatedAt());
        if (review.getSession() != null) {
            dto.setSessionId(review.getSession().getId());
        }
        return dto;
    }
}
