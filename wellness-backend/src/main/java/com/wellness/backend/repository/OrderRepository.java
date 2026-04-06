package com.wellness.backend.repository;

import com.wellness.backend.enums.PaymentStatus;
import com.wellness.backend.model.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<Order, Integer> {

    // Find all orders globally (admin)
    List<Order> findAllByOrderByOrderDateDesc();

    // Find all orders for a user
    @Query("SELECT o FROM Order o WHERE o.user.id = :userId ORDER BY o.orderDate DESC")
    List<Order> findByUser_IdOrderByOrderDateDesc(@Param("userId") Integer userId);

    // Find orders by status
    List<Order> findByStatus(Order.OrderStatus status);

    // Find orders by payment status
    List<Order> findByPaymentStatus(PaymentStatus status);

    // Find recent orders for a user
    @Query("SELECT o FROM Order o WHERE o.user.id = :userId ORDER BY o.orderDate DESC LIMIT :limit")
    List<Order> findRecentOrdersForUser(@Param("userId") Integer userId, @Param("limit") Integer limit);

    // Find orders by date range
    @Query("SELECT o FROM Order o WHERE o.orderDate BETWEEN :startDate AND :endDate ORDER BY o.orderDate DESC")
    List<Order> findOrdersByDateRange(@Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);

    // Analytics
    long countByStatus(Order.OrderStatus status);

    long countByPaymentStatus(PaymentStatus status);

    @Query(value = "SELECT DATE_FORMAT(order_date, '%Y-%m') AS month, COUNT(*) FROM orders GROUP BY month ORDER BY month", nativeQuery = true)
    List<Object[]> countOrdersGroupedByMonth();

    @Query("SELECT COALESCE(SUM(o.totalAmount), 0) FROM Order o WHERE o.paymentStatus = com.wellness.backend.enums.PaymentStatus.PAID")
    java.math.BigDecimal sumPaidOrderRevenue();

    @Query(value = "SELECT DATE_FORMAT(order_date, '%Y-%m') AS month, COALESCE(SUM(total_amount), 0) FROM orders WHERE payment_status = 'PAID' GROUP BY month ORDER BY month", nativeQuery = true)
    List<Object[]> sumRevenueGroupedByMonth();
}
