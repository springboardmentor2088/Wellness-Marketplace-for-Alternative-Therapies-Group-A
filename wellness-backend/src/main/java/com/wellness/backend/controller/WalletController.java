package com.wellness.backend.controller;

import com.wellness.backend.model.UserWallet;
import com.wellness.backend.model.WalletTransaction;
import com.wellness.backend.model.User;
import com.wellness.backend.repository.UserRepository;
import com.wellness.backend.repository.UserWalletRepository;
import com.wellness.backend.repository.WalletTransactionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import com.wellness.backend.service.WalletService;
import java.util.Map;
import java.math.BigDecimal;

@RestController
@RequestMapping("/api/wallet")
public class WalletController {

        @Autowired
        private WalletService walletService;

        @Autowired
        private UserRepository userRepository;

        @PreAuthorize("hasRole('PATIENT') or hasRole('PRACTITIONER')")
        @GetMapping("/balance")
        public ResponseEntity<Map<String, Object>> getBalance(Authentication authentication) {
                User user = userRepository.findByEmail(authentication.getName())
                                .orElseThrow(() -> new RuntimeException("User not found"));

                UserWallet wallet = walletService.getOrCreateWallet(user);

                return ResponseEntity.ok(Map.of(
                                "walletId", wallet.getId(),
                                "balance", wallet.getBalance()));
        }

        @PreAuthorize("hasRole('PATIENT') or hasRole('PRACTITIONER')")
        @GetMapping("/transactions")
        public ResponseEntity<Page<WalletTransaction>> getTransactions(
                        Authentication authentication,
                        @RequestParam(defaultValue = "0") int page,
                        @RequestParam(defaultValue = "10") int size) {

                User user = userRepository.findByEmail(authentication.getName())
                                .orElseThrow(() -> new RuntimeException("User not found"));

                Page<WalletTransaction> transactions = walletService.getTransactionHistory(
                                user.getId(), PageRequest.of(page, size));

                return ResponseEntity.ok(transactions);
        }

        @PreAuthorize("hasRole('PATIENT') or hasRole('PRACTITIONER')")
        @PostMapping("/withdraw")
        public ResponseEntity<?> withdraw(
                        Authentication authentication,
                        @RequestBody Map<String, Object> payload) {
                User user = userRepository.findByEmail(authentication.getName())
                                .orElseThrow(() -> new RuntimeException("User not found"));
                try {
                        BigDecimal amount = new BigDecimal(payload.get("amount").toString());
                        String reason = payload.containsKey("reason") ? payload.get("reason").toString()
                                        : "Withdraw to bank";
                        walletService.withdraw(user, amount, reason, WalletTransaction.Type.WITHDRAWAL);
                        return ResponseEntity.ok(Map.of("message", "Withdrawal successful"));
                } catch (Exception e) {
                        return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
                }
        }

        @PreAuthorize("hasRole('PATIENT') or hasRole('PRACTITIONER')")
        @PostMapping("/deposit")
        public ResponseEntity<?> deposit(
                        Authentication authentication,
                        @RequestBody Map<String, Object> payload) {
                User user = userRepository.findByEmail(authentication.getName())
                                .orElseThrow(() -> new RuntimeException("User not found"));
                try {
                        BigDecimal amount = new BigDecimal(payload.get("amount").toString());
                        String reason = payload.containsKey("reason") ? payload.get("reason").toString()
                                        : "Manual Deposit";
                        walletService.deposit(user, amount, reason, WalletTransaction.Type.DEPOSIT);
                        return ResponseEntity.ok(Map.of("message", "Deposit successful"));
                } catch (Exception e) {
                        return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
                }
        }
}
