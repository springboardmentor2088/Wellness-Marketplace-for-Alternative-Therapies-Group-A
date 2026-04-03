package com.wellness.backend.repository;

import com.wellness.backend.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Integer> {
    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    Optional<User> findByPhone(String phone);

    boolean existsByPhone(String phone);

    Page<User> findByRole(User.Role role, Pageable pageable);

    Page<User> findByBlockedTrue(Pageable pageable);

    // Analytics
    long countByRole(User.Role role);

    @Query(value = "SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) FROM users GROUP BY month ORDER BY month", nativeQuery = true)
    List<Object[]> countUsersGroupedByMonth();
}
