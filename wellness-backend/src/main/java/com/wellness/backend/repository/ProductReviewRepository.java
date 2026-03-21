package com.wellness.backend.repository;

import com.wellness.backend.model.ProductReview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductReviewRepository extends JpaRepository<ProductReview, Integer> {

    List<ProductReview> findByProduct_IdOrderByCreatedAtDesc(Integer productId);

    boolean existsByUser_IdAndProduct_Id(Integer userId, Integer productId);

    @Query("SELECT AVG(r.rating) FROM ProductReview r WHERE r.product.id = :productId")
    Double findAverageRatingByProductId(@Param("productId") Integer productId);
}
