package com.wellness.backend.repository;

import com.wellness.backend.model.PractitionerDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PractitionerDocumentRepository extends JpaRepository<PractitionerDocument, Integer> {

    // Find all documents for a practitioner, ordered by upload date (latest first)
    @Query("SELECT d FROM PractitionerDocument d WHERE d.practitioner.id = :practitionerId ORDER BY d.uploadedAt DESC")
    List<PractitionerDocument> findByPractitionerId(Integer practitionerId);

    // Find all documents for a practitioner by user ID
    @Query("SELECT d FROM PractitionerDocument d WHERE d.practitioner.user.id = :userId ORDER BY d.uploadedAt DESC")
    List<PractitionerDocument> findByPractitionerUserId(Integer userId);

    // Delete all documents for a practitioner
    void deleteByPractitioner_Id(Integer practitionerId);
}
