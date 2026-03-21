package com.wellness.backend.service;

import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import com.razorpay.Utils;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

@Service
public class RazorpayPaymentGateway implements PaymentGateway {

    private final String keyId;
    private final String keySecret;

    public RazorpayPaymentGateway(
            @Value("${razorpay.key.id}") String keyId,
            @Value("${razorpay.key.secret}") String keySecret) {
        this.keyId = keyId;
        this.keySecret = keySecret;
    }

    @Override
    public Map<String, String> createOrder(BigDecimal amount, String currency, String receiptId) throws Exception {
        RazorpayClient client = new RazorpayClient(keyId, keySecret);

        JSONObject orderRequest = new JSONObject();
        // Razorpay expects amount in paise (1 INR = 100 Paise)
        orderRequest.put("amount", amount.multiply(new BigDecimal(100)).intValue());
        orderRequest.put("currency", currency);
        orderRequest.put("receipt", receiptId);

        Order order = client.orders.create(orderRequest);

        Map<String, String> orderDetails = new HashMap<>();
        orderDetails.put("orderId", order.get("id"));
        orderDetails.put("amount", order.get("amount").toString());
        orderDetails.put("currency", order.get("currency"));
        orderDetails.put("status", order.get("status"));
        orderDetails.put("keyId", keyId); // Include keyId for frontend
        return orderDetails;
    }

    @Override
    public boolean verifySignature(String orderId, String paymentId, String signature) {
        try {
            JSONObject attributes = new JSONObject();
            attributes.put("razorpay_order_id", orderId);
            attributes.put("razorpay_payment_id", paymentId);
            attributes.put("razorpay_signature", signature);

            return Utils.verifyPaymentSignature(attributes, keySecret);
        } catch (RazorpayException e) {
            return false;
        }
    }

    @Override
    public Map<String, String> initiateRefund(String paymentId, BigDecimal amount, String receiptId) throws Exception {
        RazorpayClient client = new RazorpayClient(keyId, keySecret);

        JSONObject refundRequest = new JSONObject();
        refundRequest.put("payment_id", paymentId);
        refundRequest.put("amount", amount.multiply(new BigDecimal(100)).intValue());

        // Note: SDK structure might vary slightly, but this is the standard flow
        com.razorpay.Refund refund = client.payments.refund(refundRequest);

        Map<String, String> refundDetails = new HashMap<>();
        refundDetails.put("refundId", refund.get("id"));
        refundDetails.put("status", refund.get("status"));
        return refundDetails;
    }
}
