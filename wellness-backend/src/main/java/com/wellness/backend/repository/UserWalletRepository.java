package com.wellness.backend.repository;

import com.wellness.backend.model.UserWallet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserWalletRepository extends JpaRepository<UserWallet, Integer> {
    Optional<UserWallet> findByUserId(Integer userId);
}
