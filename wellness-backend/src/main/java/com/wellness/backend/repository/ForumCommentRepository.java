package com.wellness.backend.repository;

import com.wellness.backend.model.ForumComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ForumCommentRepository extends JpaRepository<ForumComment, Integer> {
    List<ForumComment> findByAnswerId(Integer answerId);
}
