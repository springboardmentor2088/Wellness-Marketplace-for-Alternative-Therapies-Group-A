package com.wellness.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "seller_earning")
public class SellerEarning {

    public enum PayoutStatus {
        PENDING, PAID
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "seller_id", nullable = false)
    private ProductSellerProfile seller;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount; // Total item amount

    @Column(name = "platform_fee", nullable = false, precision = 10, scale = 2)
    private BigDecimal platformFee = BigDecimal.ZERO;

    @Column(name = "net_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal netAmount = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(name = "payout_status", nullable = false)
    private PayoutStatus payoutStatus = PayoutStatus.PENDING;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    // Getters and Setters
    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public ProductSellerProfile getSeller() { return seller; }
    public void setSeller(ProductSellerProfile seller) { this.seller = seller; }

    public Order getOrder() { return order; }
    public void setOrder(Order order) { this.order = order; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public BigDecimal getPlatformFee() { return platformFee; }
    public void setPlatformFee(BigDecimal platformFee) { this.platformFee = platformFee; }

    public BigDecimal getNetAmount() { return netAmount; }
    public void setNetAmount(BigDecimal netAmount) { this.netAmount = netAmount; }

    public PayoutStatus getPayoutStatus() { return payoutStatus; }
    public void setPayoutStatus(PayoutStatus payoutStatus) { this.payoutStatus = payoutStatus; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
