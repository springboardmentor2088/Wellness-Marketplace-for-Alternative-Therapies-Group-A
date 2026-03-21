package com.wellness.backend.controller;

import com.wellness.backend.service.PaymentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    @Autowired
    private PaymentService paymentService;

    @org.springframework.beans.factory.annotation.Value("${razorpay.key.id}")
    private String keyId;

    @PreAuthorize("hasRole('PATIENT')")
    @PostMapping("/initiate")
    public ResponseEntity<Map<String, String>> initiatePayment(
            @RequestBody Map<String, Object> payload,
            Authentication authentication) {

        // In a real app, user identity might just come from token, but here we expect
        // sessionId and userId in payload
        // Example: { "sessionId": 12, "userId": 5, "amount": 75.00 }

        try {
            Integer sessionId = (Integer) payload.get("sessionId");
            Integer orderId = (Integer) payload.get("orderId");
            Integer userId = (Integer) payload.get("userId");
            BigDecimal amount = new BigDecimal(payload.get("amount").toString());

            Map<String, String> orderDetails = paymentService.initiatePayment(sessionId, orderId, userId, amount);
            orderDetails.put("keyId", keyId); // Pass keyId to frontend
            return ResponseEntity.ok(orderDetails);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/webhook")
    public ResponseEntity<String> paymentWebhook(@RequestBody Map<String, String> payload) {
        // Here the payment gateway hits this endpoint on success/failure
        String orderId = payload.get("orderId");
        String paymentId = payload.get("paymentId");
        String signature = payload.get("signature");

        boolean isVerified = paymentService.verifyPaymentAndConfirmSession(orderId, paymentId, signature);

        if (isVerified) {
            return ResponseEntity.ok("OK");
        } else {
            return ResponseEntity.badRequest().body("Signature Verification Failed");
        }
    }

    @PreAuthorize("hasRole('PATIENT')")
    @PostMapping("/wallet-pay")
    public ResponseEntity<Map<String, String>> payWithWallet(
            @RequestBody Map<String, Object> payload,
            Authentication authentication) {
        try {
            Integer sessionId = (Integer) payload.get("sessionId");
            Integer orderId = (Integer) payload.get("orderId");
            Integer userId = (Integer) payload.get("userId");
            BigDecimal amount = new BigDecimal(payload.get("amount").toString());

            boolean success = paymentService.payWithWallet(sessionId, orderId, userId, amount);
            if (success) {
                return ResponseEntity.ok(Map.of("status", "SUCCESS", "message", "Payment successful using wallet"));
            } else {
                return ResponseEntity.badRequest().body(Map.of("error", "Payment failed"));
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
