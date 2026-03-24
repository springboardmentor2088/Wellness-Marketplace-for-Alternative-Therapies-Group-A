package com.wellness.backend.controller;

import com.wellness.backend.model.ProductReview;
import com.wellness.backend.model.Product;
import com.wellness.backend.model.User;
import com.wellness.backend.repository.ProductReviewRepository;
import com.wellness.backend.repository.ProductRepository;
import com.wellness.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;
import org.springframework.transaction.annotation.Transactional;

@RestController
@RequestMapping("/api/product-reviews")
public class ProductReviewController {

    @Autowired
    private ProductReviewRepository productReviewRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private UserRepository userRepository;

    // GET /api/product-reviews/{productId} — Get all reviews for a product
    @Transactional(readOnly = true)
    @GetMapping("/{productId}")
    public ResponseEntity<Map<String, Object>> getReviewsByProduct(@PathVariable Integer productId) {
        List<ProductReview> reviews = productReviewRepository.findByProduct_IdOrderByCreatedAtDesc(productId);
        Double avgRating = productReviewRepository.findAverageRatingByProductId(productId);

        List<Map<String, Object>> reviewList = reviews.stream().map(r -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", r.getId());
            map.put("userId", r.getUser().getId());
            map.put("userName", r.getUser().getName());
            map.put("rating", r.getRating());
            map.put("comment", r.getComment());
            map.put("createdAt", r.getCreatedAt());
            return map;
        }).collect(Collectors.toList());

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("averageRating", avgRating != null ? Math.round(avgRating * 10.0) / 10.0 : null);
        response.put("totalReviews", reviews.size());
        response.put("reviews", reviewList);

        return ResponseEntity.ok(response);
    }

    // POST /api/product-reviews — Submit a product review
    @PreAuthorize("hasAnyRole('PATIENT', 'PRACTITIONER', 'ADMIN')")
    @PostMapping
    public ResponseEntity<?> createProductReview(
            @RequestBody Map<String, Object> body,
            Authentication authentication) {

        String userEmail = authentication.getName();
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Integer productId = (Integer) body.get("productId");
        Integer rating = (Integer) body.get("rating");
        String comment = (String) body.get("comment");

        if (productId == null || rating == null || rating < 1 || rating > 5) {
            return ResponseEntity.badRequest().body(Map.of("message", "Product ID and rating (1-5) are required"));
        }

        if (productReviewRepository.existsByUser_IdAndProduct_Id(user.getId(), productId)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("message", "You have already reviewed this product"));
        }

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Product not found"));

        ProductReview review = new ProductReview();
        review.setUser(user);
        review.setProduct(product);
        review.setRating(rating);
        review.setComment(comment);

        ProductReview saved = productReviewRepository.save(review);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", saved.getId());
        result.put("productId", product.getId());
        result.put("rating", saved.getRating());
        result.put("comment", saved.getComment());
        result.put("createdAt", saved.getCreatedAt());

        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }
}
