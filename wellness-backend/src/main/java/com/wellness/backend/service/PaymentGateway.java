package com.wellness.backend.service;

import java.math.BigDecimal;
import java.util.Map;

public interface PaymentGateway {

    /**
     * Creates an order/payment intent on the gateway.
     * 
     * @param amount    The amount to be paid.
     * @param currency  The currency code (e.g., INR, USD).
     * @param receiptId A unique identifier for the receipt.
     * @return A map containing gateway-specific order details (e.g., orderId).
     */
    Map<String, String> createOrder(BigDecimal amount, String currency, String receiptId) throws Exception;

    /**
     * Verifies the payment signature to ensure authenticity.
     * 
     * @param orderId   The original order ID.
     * @param paymentId The payment ID returned by the gateway.
     * @param signature The signature returned by the gateway.
     * @return true if valid, false otherwise.
     */
    boolean verifySignature(String orderId, String paymentId, String signature);

    /**
     * Initiates a refund for a previously successful payment.
     * 
     * @param paymentId The payment ID to refund.
     * @param amount    The amount to refund.
     * @param receiptId A unique identifier for the refund receipt.
     * @return A map with gateway-specific refund details (e.g., refundId).
     */
    Map<String, String> initiateRefund(String paymentId, BigDecimal amount, String receiptId) throws Exception;
}
