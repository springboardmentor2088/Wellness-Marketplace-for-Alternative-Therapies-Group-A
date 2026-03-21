package com.wellness.backend.repository;

import com.wellness.backend.model.WalletTransaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface WalletTransactionRepository extends JpaRepository<WalletTransaction, Integer> {
    Page<WalletTransaction> findByWalletIdOrderByCreatedAtDesc(Integer walletId, Pageable pageable);
}
