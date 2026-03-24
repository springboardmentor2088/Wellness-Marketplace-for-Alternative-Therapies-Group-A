package com.wellness.backend.repository;

import com.wellness.backend.model.AnswerLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AnswerLikeRepository extends JpaRepository<AnswerLike, Integer> {
    Optional<AnswerLike> findByAnswerIdAndUserId(Integer answerId, Integer userId);
    boolean existsByAnswerIdAndUserId(Integer answerId, Integer userId);
    void deleteByAnswerIdAndUserId(Integer answerId, Integer userId);
    long countByAnswerId(Integer answerId);
}
