package com.wellness.backend.service;

import com.wellness.backend.enums.PaymentStatus;
import com.wellness.backend.model.*;
import com.wellness.backend.repository.PaymentTransactionRepository;
import com.wellness.backend.repository.RefundTransactionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Service
public class RefundService {

    @Autowired
    private RefundTransactionRepository refundTransactionRepository;

    @Autowired
    private PaymentTransactionRepository paymentTransactionRepository;

    @Autowired
    private RefundPolicyService refundPolicyService;

    @Autowired
    private WalletService walletService;

    @Autowired
    private SessionNotificationService notificationService;

    @Autowired
    private AuditLogService auditLogService;

    @Transactional
    public void initiateRefund(TherapySession session, TherapySession.CancelledBy cancelledBy, String reason) {
        if (session.getPaymentStatus() != PaymentStatus.PAID) {
            return;
        }

        PaymentTransaction paymentTx = paymentTransactionRepository.findBySessionIdAndPaymentStatus(
                session.getId(), PaymentTransaction.PaymentStatus.SUCCESS).orElse(null);

        if (paymentTx == null)
            return;

        BigDecimal refundAmount = refundPolicyService.calculateRefundAmount(session, cancelledBy,
                session.getFeeAmount());

        if (refundAmount.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }

        // 1. Create RefundTransaction (PENDING)
        RefundTransaction refundTx = new RefundTransaction();
        refundTx.setSession(session);
        refundTx.setUser(session.getUser());
        refundTx.setPaymentTransaction(paymentTx);
        refundTx.setAmount(refundAmount);
        refundTx.setReason(reason);
        refundTx.setStatus(RefundTransaction.RefundStatus.PENDING);
        refundTx = refundTransactionRepository.save(refundTx);

        // 2. Process Refund
        processRefund(refundTx);
    }

    @Transactional
    public void processRefund(RefundTransaction refundTx) {
        refundTx.setStatus(RefundTransaction.RefundStatus.PROCESSING);
        refundTransactionRepository.save(refundTx);

        try {
            // 3. Deposit to wallet
            walletService.deposit(
                    refundTx.getUser(),
                    refundTx.getAmount(),
                    "Refund for cancelled session #" + refundTx.getSession().getId(),
                    WalletTransaction.Type.REFUND);

            // 4. Mark success
            refundTx.setStatus(RefundTransaction.RefundStatus.SUCCESS);
            refundTx.setProcessedAt(LocalDateTime.now());
            refundTransactionRepository.save(refundTx);

            // 5. Notify
            notificationService.notifyRefundProcessed(refundTx.getUser().getId(), refundTx.getAmount());

            auditLogService.logAction(
                    refundTx.getUser().getId(),
                    "REFUND_PROCESSED",
                    "RefundTransaction",
                    refundTx.getId().toString(),
                    "Amount: " + refundTx.getAmount());

        } catch (Exception e) {
            refundTx.setStatus(RefundTransaction.RefundStatus.FAILED);
            refundTransactionRepository.save(refundTx);
            throw new RuntimeException("Refund failed to process", e);
        }
    }
}

