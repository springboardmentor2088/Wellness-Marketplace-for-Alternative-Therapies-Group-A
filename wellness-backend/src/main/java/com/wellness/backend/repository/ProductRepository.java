package com.wellness.backend.repository;

import com.wellness.backend.enums.ProductModerationStatus;
import com.wellness.backend.model.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, Integer> {

    // Find products by category
    List<Product> findByCategory(String category);

    // Find products with low stock
    @Query("SELECT p FROM Product p WHERE p.stock < :threshold")
    List<Product> findLowStockProducts(@Param("threshold") Integer threshold);

    // Search products by name (case-insensitive)
    @Query("SELECT p FROM Product p WHERE LOWER(p.name) LIKE LOWER(CONCAT('%', :name, '%'))")
    List<Product> searchByName(@Param("name") String name);

    // Find available products (stock > 0)
    List<Product> findByStockGreaterThan(Integer stock);

    // Search by synonyms for Medical Intelligence matching
    @Query("SELECT p FROM Product p WHERE p.activeIngredient IN :synonyms OR LOWER(p.name) LIKE LOWER(CONCAT('%', :primaryQuery, '%'))")
    List<Product> findBySynonyms(@Param("synonyms") List<String> synonyms, @Param("primaryQuery") String primaryQuery);

    List<Product> findBySeller_Id(Integer sellerId);
    List<Product> findByModerationStatus(ProductModerationStatus status);
}
