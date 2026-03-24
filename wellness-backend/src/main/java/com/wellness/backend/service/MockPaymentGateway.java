package com.wellness.backend.service;

import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
@org.springframework.context.annotation.Primary
public class MockPaymentGateway implements PaymentGateway {

    @Override
    public Map<String, String> createOrder(BigDecimal amount, String currency, String receiptId) {
        Map<String, String> orderDetails = new HashMap<>();
        orderDetails.put("orderId", "mock_order_" + UUID.randomUUID().toString().substring(0, 8));
        orderDetails.put("amount", amount.toString());
        orderDetails.put("currency", currency);
        orderDetails.put("status", "created");
        return orderDetails;
    }

    @Override
    public boolean verifySignature(String orderId, String paymentId, String signature) {
        // In mock, always return true, assuming the mock frontend will send a
        // valid-looking signature.
        return true;
    }

    @Override
    public Map<String, String> initiateRefund(String paymentId, BigDecimal amount, String receiptId) {
        Map<String, String> refundDetails = new HashMap<>();
        refundDetails.put("refundId", "mock_refund_" + UUID.randomUUID().toString().substring(0, 8));
        refundDetails.put("status", "processed");
        return refundDetails;
    }
}
