package com.wellness.backend.service;

import com.wellness.backend.enums.ReferenceType;
import com.wellness.backend.model.User;
import com.wellness.backend.model.UserWallet;
import com.wellness.backend.model.WalletTransaction;
import com.wellness.backend.repository.UserWalletRepository;
import com.wellness.backend.repository.WalletTransactionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Optional;

@Service
public class WalletService {

    @Autowired
    private UserWalletRepository userWalletRepository;

    @Autowired
    private WalletTransactionRepository walletTransactionRepository;

    @Transactional
    public UserWallet getOrCreateWallet(User user) {
        return userWalletRepository.findByUserId(user.getId())
                .orElseGet(() -> {
                    UserWallet newWallet = new UserWallet();
                    newWallet.setUser(user);
                    return userWalletRepository.save(newWallet);
                });
    }

    @Transactional(readOnly = true)
    public BigDecimal getBalance(Integer userId) {
        Optional<UserWallet> wallet = userWalletRepository.findByUserId(userId);
        return wallet.map(UserWallet::getBalance).orElse(BigDecimal.ZERO);
    }

    @Transactional
    public void deposit(User user, BigDecimal amount, String description, WalletTransaction.Type type) {
        UserWallet wallet = getOrCreateWallet(user);
        wallet.setBalance(wallet.getBalance().add(amount));
        userWalletRepository.save(wallet);

        WalletTransaction wt = new WalletTransaction();
        wt.setWallet(wallet);
        wt.setAmount(amount);
        wt.setType(type);
        wt.setDescription(description);
        walletTransactionRepository.save(wt);
    }

    @Transactional(readOnly = true)
    public Page<WalletTransaction> getTransactionHistory(Integer userId, Pageable pageable) {
        UserWallet wallet = getOrCreateWallet(new User() {
            {
                setId(userId);
            }
        }); // Temporary mock up for fast ID check
        return walletTransactionRepository.findByWalletIdOrderByCreatedAtDesc(wallet.getId(), pageable);
    }

    @Transactional
    public void withdraw(User user, BigDecimal amount, String description, WalletTransaction.Type type) {
        UserWallet wallet = getOrCreateWallet(user);
        if (wallet.getBalance().compareTo(amount) < 0) {
            throw new RuntimeException("Insufficient wallet balance");
        }
        wallet.setBalance(wallet.getBalance().subtract(amount));
        userWalletRepository.save(wallet);

        WalletTransaction wt = new WalletTransaction();
        wt.setWallet(wallet);
        wt.setAmount(amount); // Amount is recorded positively, but transaction type classifies it
        wt.setType(type);
        wt.setDescription(description);
        walletTransactionRepository.save(wt);
    }

    /**
     * Records a transaction in the ledger WITHOUT modifying wallet balance.
     * Used for external (gateway) payments so they appear in history.
     */
    @Transactional
    public void addTransactionOnly(User user, BigDecimal amount, String description,
                                   WalletTransaction.Type type, String referenceId, ReferenceType referenceType) {
        UserWallet wallet = getOrCreateWallet(user);

        WalletTransaction wt = new WalletTransaction();
        wt.setWallet(wallet);
        wt.setAmount(amount);
        wt.setType(type);
        wt.setDescription(description);
        wt.setReferenceId(referenceId);
        wt.setReferenceType(referenceType);
        walletTransactionRepository.save(wt);
    }
}

