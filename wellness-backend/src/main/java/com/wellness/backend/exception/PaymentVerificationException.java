package com.wellness.backend.exception;

public class PaymentVerificationException extends RuntimeException {
    public PaymentVerificationException(String message) {
        super(message);
    }
}
