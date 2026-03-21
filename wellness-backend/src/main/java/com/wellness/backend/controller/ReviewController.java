package com.wellness.backend.controller;

import com.wellness.backend.dto.CreateReviewDTO;
import com.wellness.backend.dto.ReviewDTO;
import com.wellness.backend.service.ReviewService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reviews")
public class ReviewController {

    @Autowired
    private ReviewService reviewService;

    // POST /api/reviews — Submit a review (authenticated users only)
    @PreAuthorize("hasAnyRole('PATIENT', 'PRACTITIONER', 'ADMIN')")
    @PostMapping
    public ResponseEntity<ReviewDTO> createReview(
            @Valid @RequestBody CreateReviewDTO dto,
            Authentication authentication) {
        String userEmail = authentication.getName();
        ReviewDTO review = reviewService.createReview(dto, userEmail);
        return ResponseEntity.status(HttpStatus.CREATED).body(review);
    }

    // GET /api/reviews/practitioner/{id} — Get all reviews for a practitioner (public)
    @GetMapping("/practitioner/{id}")
    public ResponseEntity<List<ReviewDTO>> getReviewsByPractitioner(@PathVariable Integer id) {
        List<ReviewDTO> reviews = reviewService.getReviewsByPractitioner(id);
        return ResponseEntity.ok(reviews);
    }
}
