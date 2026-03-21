package com.wellness.backend.repository;

import com.wellness.backend.model.PaymentTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, Integer> {
    Optional<PaymentTransaction> findByGatewayOrderId(String gatewayOrderId);

    Optional<PaymentTransaction> findBySessionIdAndPaymentStatus(Integer sessionId,
            PaymentTransaction.PaymentStatus paymentStatus);
            
    @Query("SELECT p FROM PaymentTransaction p WHERE p.order.id = :orderId")
    List<PaymentTransaction> findByOrderId(@Param("orderId") Integer orderId);
}
