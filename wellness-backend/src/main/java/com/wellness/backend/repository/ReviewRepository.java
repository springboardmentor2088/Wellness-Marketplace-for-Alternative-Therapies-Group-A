package com.wellness.backend.repository;

import com.wellness.backend.model.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Integer> {

    // Get all reviews for a practitioner, newest first
    List<Review> findByPractitioner_IdOrderByCreatedAtDesc(Integer practitionerId);

    // Check if a user already reviewed this practitioner
    boolean existsByUser_IdAndPractitioner_Id(Integer userId, Integer practitionerId);

    // Calculate average rating for a practitioner
    // Check if a review exists for a specific session
    boolean existsBySession_Id(Integer sessionId);

    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.practitioner.id = :practitionerId")
    Double findAverageRatingByPractitionerId(@Param("practitionerId") Integer practitionerId);
}
