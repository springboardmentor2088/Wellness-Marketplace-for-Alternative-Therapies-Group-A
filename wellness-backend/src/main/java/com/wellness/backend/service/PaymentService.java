package com.wellness.backend.service;

import com.wellness.backend.enums.PaymentStatus;
import com.wellness.backend.enums.ReferenceType;
import com.wellness.backend.enums.SessionStatus;
import com.wellness.backend.model.PaymentTransaction;
import com.wellness.backend.model.TherapySession;
import com.wellness.backend.model.User;
import com.wellness.backend.model.Order;
import com.wellness.backend.repository.OrderRepository;
import com.wellness.backend.repository.PaymentTransactionRepository;
import com.wellness.backend.repository.TherapySessionRepository;
import com.wellness.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

@Service
public class PaymentService {

    @Autowired
    private PaymentGateway paymentGateway;

    @Autowired
    private PaymentTransactionRepository paymentTransactionRepository;

    @Autowired
    private TherapySessionRepository therapySessionRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private AuditLogService auditLogService;

    @Autowired
    private SessionNotificationService notificationService;

    @Autowired
    private OrderService orderService;

    @Transactional
    public Map<String, String> initiatePayment(Integer sessionId, Integer orderId, Integer userId, BigDecimal amount) throws Exception {
        TherapySession session = null;
        Order order = null;

        if (sessionId != null) {
            session = therapySessionRepository.findById(sessionId)
                    .orElseThrow(() -> new RuntimeException("Session not found"));
            if (!session.getStatus().equals(SessionStatus.HOLD)) {
                throw new RuntimeException("Payment can only be initiated for sessions on HOLD.");
            }
        } else if (orderId != null) {
            order = orderRepository.findById(orderId)
                    .orElseThrow(() -> new RuntimeException("Order not found"));
            if (order.getPaymentStatus() == PaymentStatus.PAID) {
                throw new RuntimeException("Order is already paid.");
            }
        } else {
            throw new RuntimeException("Either sessionId or orderId must be provided.");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        String receiptId = "rcpt_" + UUID.randomUUID().toString().substring(0, 8);
        Map<String, String> orderDetails = paymentGateway.createOrder(amount, "INR", receiptId);

        PaymentTransaction transaction = new PaymentTransaction();
        transaction.setSession(session);
        transaction.setOrder(order);
        transaction.setUser(user);
        transaction.setAmount(amount);
        transaction.setCurrency("INR");
        transaction.setGateway("razorpay");
        transaction.setGatewayOrderId(orderDetails.get("orderId"));
        transaction.setPaymentStatus(PaymentTransaction.PaymentStatus.PENDING);

        paymentTransactionRepository.save(transaction);

        return orderDetails;
    }

    @Transactional
    public boolean verifyPaymentAndConfirmSession(String orderId, String paymentId, String signature) {
        PaymentTransaction transaction = paymentTransactionRepository.findByGatewayOrderId(orderId)
                .orElseThrow(() -> new RuntimeException("Payment transaction not found"));

        if (transaction.getPaymentStatus() == PaymentTransaction.PaymentStatus.SUCCESS) {
            return true;
        }

        boolean isValid = paymentGateway.verifySignature(orderId, paymentId, signature);

        if (isValid) {
            transaction.setPaymentStatus(PaymentTransaction.PaymentStatus.SUCCESS);
            transaction.setGatewayPaymentId(paymentId);
            transaction.setGatewaySignature(signature);
            paymentTransactionRepository.save(transaction);

            if (transaction.getSession() != null) {
                TherapySession session = transaction.getSession();
                session.setStatus(SessionStatus.BOOKED);
                session.setPaymentStatus(PaymentStatus.PAID);
                therapySessionRepository.save(session);

                notificationService.notifySessionBooked(
                        session.getUser().getId(),
                        session.getPractitioner().getUser().getId(),
                        session.getPractitioner().getUser().getName(),
                        java.time.LocalDateTime.of(session.getSessionDate(), session.getStartTime()));

                // Record in wallet ledger for traceability
                walletService.addTransactionOnly(transaction.getUser(), transaction.getAmount(),
                        "Payment for Session #" + session.getId(),
                        com.wellness.backend.model.WalletTransaction.Type.PAYMENT,
                        session.getId().toString(), ReferenceType.SESSION);
            } else if (transaction.getOrder() != null) {
                Order order = transaction.getOrder();
                orderService.markOrderAsPaid(order.getId());

                // Record in wallet ledger for traceability
                walletService.addTransactionOnly(transaction.getUser(), transaction.getAmount(),
                        "Payment for Order #" + order.getId(),
                        com.wellness.backend.model.WalletTransaction.Type.PAYMENT,
                        order.getId().toString(), ReferenceType.ORDER);
            }

            auditLogService.logAction(
                    transaction.getUser().getId(),
                    "PAYMENT_SUCCESS",
                    "PaymentTransaction",
                    transaction.getId().toString(),
                    "Amount: " + transaction.getAmount() + " " + transaction.getCurrency());

            return true;
        } else {
            transaction.setPaymentStatus(PaymentTransaction.PaymentStatus.FAILED);
            paymentTransactionRepository.save(transaction);

            if (transaction.getSession() != null) {
                TherapySession session = transaction.getSession();
                session.setStatus(SessionStatus.CANCELLED);
                therapySessionRepository.save(session);
            } else if (transaction.getOrder() != null) {
                Order order = transaction.getOrder();
                order.setPaymentStatus(PaymentStatus.FAILED);
                orderRepository.save(order);
            }
            return false;
        }
    }

    @Autowired
    private WalletService walletService;

    @Transactional
    public boolean payWithWallet(Integer sessionId, Integer orderId, Integer userId, BigDecimal amount) {
        TherapySession session = null;
        Order order = null;

        if (sessionId != null) {
            session = therapySessionRepository.findById(sessionId)
                    .orElseThrow(() -> new RuntimeException("Session not found"));
            if (!session.getStatus().equals(SessionStatus.HOLD)) {
                throw new RuntimeException("Payment can only be processed for sessions on HOLD.");
            }
        } else if (orderId != null) {
            order = orderRepository.findById(orderId)
                    .orElseThrow(() -> new RuntimeException("Order not found"));
        } else {
            throw new RuntimeException("Either sessionId or orderId must be provided.");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        walletService.withdraw(user, amount, 
                sessionId != null ? "Payment for session " + sessionId : "Payment for order #" + orderId,
                com.wellness.backend.model.WalletTransaction.Type.WITHDRAWAL);

        PaymentTransaction transaction = new PaymentTransaction();
        transaction.setSession(session);
        transaction.setOrder(order);
        transaction.setUser(user);
        transaction.setAmount(amount);
        transaction.setCurrency("INR");
        transaction.setGateway("wallet");
        transaction.setGatewayOrderId("wallet_" + UUID.randomUUID().toString().substring(0, 8));
        transaction.setPaymentStatus(PaymentTransaction.PaymentStatus.SUCCESS);
        paymentTransactionRepository.save(transaction);

        if (session != null) {
            session.setStatus(SessionStatus.BOOKED);
            session.setPaymentStatus(PaymentStatus.PAID);
            therapySessionRepository.save(session);

            notificationService.notifySessionBooked(
                    session.getUser().getId(),
                    session.getPractitioner().getUser().getId(),
                    session.getPractitioner().getUser().getName(),
                    java.time.LocalDateTime.of(session.getSessionDate(), session.getStartTime()));
        } else if (order != null) {
            orderService.markOrderAsPaid(order.getId());
        }

        auditLogService.logAction(
                user.getId(),
                "PAYMENT_SUCCESS_WALLET",
                "PaymentTransaction",
                transaction.getId().toString(),
                "Amount: " + amount + " INR");

        return true;
    }
}
