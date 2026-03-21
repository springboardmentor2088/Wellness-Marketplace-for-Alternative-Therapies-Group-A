package com.wellness.backend.repository;

import com.wellness.backend.model.ForumThread;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import jakarta.persistence.LockModeType;

@Repository
public interface ForumThreadRepository extends JpaRepository<ForumThread, Integer> {
    Page<ForumThread> findByCategory(String category, Pageable pageable);
    Page<ForumThread> findByAuthorId(Integer authorId, Pageable pageable);

    // Filter out deleted threads at the database level
    Page<ForumThread> findByCategoryAndIsDeletedFalse(String category, Pageable pageable);
    Page<ForumThread> findByIsDeletedFalse(Pageable pageable);

    // My Questions: user's own threads (not deleted)
    Page<ForumThread> findByAuthorIdAndIsDeletedFalse(Integer authorId, Pageable pageable);

    // Search threads by keyword in title or content
    @Query("SELECT t FROM ForumThread t WHERE t.isDeleted = false AND (LOWER(t.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(t.content) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    Page<ForumThread> searchByKeyword(@Param("keyword") String keyword, Pageable pageable);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT t FROM ForumThread t WHERE t.id = :id")
    java.util.Optional<ForumThread> findByIdWithLock(Integer id);
}
