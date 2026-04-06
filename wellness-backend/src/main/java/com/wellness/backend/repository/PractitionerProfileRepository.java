package com.wellness.backend.repository;

import com.wellness.backend.model.PractitionerProfile;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.repository.query.Param;

@Repository
public interface PractitionerProfileRepository extends JpaRepository<PractitionerProfile, Integer> {

    // Find profile by linked User ID
    Optional<PractitionerProfile> findByUser_Id(Integer userId);

    // Check if practitioner profile already exists for a user
    boolean existsByUser_Id(Integer userId);

    // Get all verified practitioners sorted by creation date (latest first)
    @Query("SELECT p FROM PractitionerProfile p WHERE p.verified = true ORDER BY p.createdAt DESC")
    List<PractitionerProfile> findByVerifiedTrue();

    // Search practitioners by specialization (case-insensitive)
    List<PractitionerProfile> findBySpecializationContainingIgnoreCase(String specialization);

    // Get top 5 practitioners matching AI Triage specialty (Flexible Match)
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"user"})
    @Query("SELECT p FROM PractitionerProfile p WHERE p.verified = true AND LOWER(p.specialization) LIKE LOWER(CONCAT('%', :specialty, '%')) ORDER BY p.rating DESC")
    List<PractitionerProfile> findTop5BySpecialty(@Param("specialty") String specialty, Pageable pageable);

    // Get all practitioners sorted by creation date (latest first)
    @Query("SELECT p FROM PractitionerProfile p ORDER BY p.createdAt DESC")
    List<PractitionerProfile> findAllOrderByCreatedAtDesc();
}
