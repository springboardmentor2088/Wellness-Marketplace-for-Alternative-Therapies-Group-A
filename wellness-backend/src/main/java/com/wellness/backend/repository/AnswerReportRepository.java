package com.wellness.backend.repository;

import com.wellness.backend.model.AnswerReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AnswerReportRepository extends JpaRepository<AnswerReport, Integer> {
    boolean existsByAnswerIdAndReporterId(Integer answerId, Integer reporterId);
    List<AnswerReport> findAllByOrderByCreatedAtDesc();
}
