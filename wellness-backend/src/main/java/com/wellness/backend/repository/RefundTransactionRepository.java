package com.wellness.backend.repository;

import com.wellness.backend.model.RefundTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RefundTransactionRepository extends JpaRepository<RefundTransaction, Integer> {
    Optional<RefundTransaction> findByPaymentTransactionId(Integer paymentTransactionId);
}
