package com.wellness.backend.repository;

public interface AnswerRankingProjection {
    Integer getId();
    Integer getThreadId();
    Double getCalculatedScore();
}
