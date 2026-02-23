package com.wellness.backend.repository;

import com.wellness.backend.model.OrderItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderItemRepository extends JpaRepository<OrderItem, Integer> {

    // Find all items for an order
    List<OrderItem> findByOrder_Id(Integer orderId);

    // Find items for a specific product
    List<OrderItem> findByProduct_Id(Integer productId);

    // Get total quantity sold for a product
    @Query("SELECT SUM(oi.quantity) FROM OrderItem oi WHERE oi.product.id = :productId")
    Integer getTotalQuantitySold(@Param("productId") Integer productId);
}
