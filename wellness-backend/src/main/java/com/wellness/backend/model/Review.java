package com.wellness.backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "review", indexes = {
        @Index(name = "idx_practitioner_id", columnList = "practitioner_id")
})
public class Review {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "practitioner_id", nullable = false)
    private PractitionerProfile practitioner;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id")
    private TherapySession session;

    @Column(nullable = false)
    private Integer rating; // 1 to 5

    @Column()
    private Integer behaviourRating; // 1 to 5

    @Column()
    private Integer treatmentEffectivenessRating; // 1 to 5

    @Column()
    private Boolean recommendPractitioner;

    @Column(columnDefinition = "TEXT")
    private String comment;

    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
    }

    // Getters and Setters
    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public PractitionerProfile getPractitioner() {
        return practitioner;
    }

    public void setPractitioner(PractitionerProfile practitioner) {
        this.practitioner = practitioner;
    }

    public Integer getRating() {
        return rating;
    }

    public void setRating(Integer rating) {
        this.rating = rating;
    }

    public Integer getBehaviourRating() {
        return behaviourRating;
    }

    public void setBehaviourRating(Integer behaviourRating) {
        this.behaviourRating = behaviourRating;
    }

    public Integer getTreatmentEffectivenessRating() {
        return treatmentEffectivenessRating;
    }

    public void setTreatmentEffectivenessRating(Integer treatmentEffectivenessRating) {
        this.treatmentEffectivenessRating = treatmentEffectivenessRating;
    }

    public Boolean getRecommendPractitioner() {
        return recommendPractitioner;
    }

    public void setRecommendPractitioner(Boolean recommendPractitioner) {
        this.recommendPractitioner = recommendPractitioner;
    }

    public String getComment() {
        return comment;
    }

    public void setComment(String comment) {
        this.comment = comment;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public TherapySession getSession() {
        return session;
    }

    public void setSession(TherapySession session) {
        this.session = session;
    }
}
