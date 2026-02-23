package com.wellness.backend.repository;

import com.wellness.backend.model.PractitionerRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PractitionerRequestRepository extends JpaRepository<PractitionerRequest, Integer> {

    // Get all requests for a specific practitioner (latest first)
    @Query("SELECT pr FROM PractitionerRequest pr WHERE pr.practitioner.id = :practitionerId ORDER BY pr.createdAt DESC")
    List<PractitionerRequest> findByPractitionerId(@Param("practitionerId") Integer practitionerId);

    // Get pending requests for a specific practitioner (latest first)
    @Query("SELECT pr FROM PractitionerRequest pr WHERE pr.practitioner.id = :practitionerId AND pr.status = 'PENDING' ORDER BY pr.createdAt DESC")
    List<PractitionerRequest> findPendingByPractitionerId(@Param("practitionerId") Integer practitionerId);

    // Get requests by status for a specific practitioner (latest first)
    @Query("SELECT pr FROM PractitionerRequest pr WHERE pr.practitioner.id = :practitionerId AND pr.status = :status ORDER BY pr.createdAt DESC")
    List<PractitionerRequest> findByPractitionerIdAndStatus(@Param("practitionerId") Integer practitionerId, @Param("status") String status);

    // Get requests by priority for a specific practitioner (latest first)
    @Query("SELECT pr FROM PractitionerRequest pr WHERE pr.practitioner.id = :practitionerId AND pr.priority = :priority ORDER BY pr.createdAt DESC")
    List<PractitionerRequest> findByPractitionerIdAndPriority(@Param("practitionerId") Integer practitionerId, @Param("priority") String priority);

    // Get all requests for a user
    @Query("SELECT pr FROM PractitionerRequest pr WHERE pr.user.id = :userId ORDER BY pr.createdAt DESC")
    List<PractitionerRequest> findByUserId(@Param("userId") Integer userId);

    // Get all requests in the system (for admin) - latest first
    @Query("SELECT pr FROM PractitionerRequest pr ORDER BY pr.createdAt DESC")
    List<PractitionerRequest> findAllOrderByCreatedAtDesc();

    // Count pending requests for a specific practitioner
    @Query("SELECT COUNT(pr) FROM PractitionerRequest pr WHERE pr.practitioner.id = :practitionerId AND pr.status = 'PENDING'")
    long countPendingByPractitionerId(@Param("practitionerId") Integer practitionerId);
}
