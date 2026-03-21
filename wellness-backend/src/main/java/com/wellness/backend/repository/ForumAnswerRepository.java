package com.wellness.backend.repository;

import com.wellness.backend.model.ForumAnswer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

@Repository
public interface ForumAnswerRepository extends JpaRepository<ForumAnswer, Integer> {
    List<ForumAnswer> findByThreadId(Integer threadId);

    @Modifying
    @Query("UPDATE ForumAnswer a SET a.likesCount = a.likesCount + 1 WHERE a.id = :id")
    void incrementLikesCount(Integer id);

    @Modifying
    @Query("UPDATE ForumAnswer a SET a.likesCount = a.likesCount - 1 WHERE a.id = :id")
    void decrementLikesCount(Integer id);

    @Modifying
    @Query("UPDATE ForumAnswer a SET a.likesCount = :count WHERE a.id = :id")
    void syncLikesCount(Integer id, long count);

    @Query(value = "SELECT a.id as id, a.thread_id as threadId, " +
            "(a.likes_count * 2.0 + " +
            "(CASE WHEN u.role = 'PRACTITIONER' THEN 20 ELSE 0 END) + " +
            "GREATEST(0, 5 - (TIMESTAMPDIFF(HOUR, a.created_at, NOW()) / 24.0))) as calculatedScore " +
            "FROM forum_answers a " +
            "JOIN users u ON a.author_id = u.id " +
            "WHERE a.thread_id = :threadId AND a.is_deleted = false " +
            "ORDER BY a.is_accepted DESC, calculatedScore DESC, a.created_at DESC", 
            nativeQuery = true)
    List<AnswerRankingProjection> findAnswerIdsWithRanking(Integer threadId);
}
