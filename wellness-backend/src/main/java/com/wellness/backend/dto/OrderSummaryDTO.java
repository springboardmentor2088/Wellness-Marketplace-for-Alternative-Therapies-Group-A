package com.wellness.backend.dto;

import java.math.BigDecimal;
import java.util.List;

public class OrderSummaryDTO {

    private List<ItemSummaryDTO> items;
    private BigDecimal subtotal;
    private BigDecimal gstAmount;
    private BigDecimal deliveryCharge;
    private BigDecimal totalAmount;

    // Getters and Setters
    public List<ItemSummaryDTO> getItems() { return items; }
    public void setItems(List<ItemSummaryDTO> items) { this.items = items; }
    public BigDecimal getSubtotal() { return subtotal; }
    public void setSubtotal(BigDecimal subtotal) { this.subtotal = subtotal; }
    public BigDecimal getGstAmount() { return gstAmount; }
    public void setGstAmount(BigDecimal gstAmount) { this.gstAmount = gstAmount; }
    public BigDecimal getDeliveryCharge() { return deliveryCharge; }
    public void setDeliveryCharge(BigDecimal deliveryCharge) { this.deliveryCharge = deliveryCharge; }
    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }

    public static class ItemSummaryDTO {
        private String productName;
        private String category;
        private Integer quantity;
        private BigDecimal price;
        private BigDecimal gstAmount;

        public String getProductName() { return productName; }
        public void setProductName(String productName) { this.productName = productName; }
        public String getCategory() { return category; }
        public void setCategory(String category) { this.category = category; }
        public Integer getQuantity() { return quantity; }
        public void setQuantity(Integer quantity) { this.quantity = quantity; }
        public BigDecimal getPrice() { return price; }
        public void setPrice(BigDecimal price) { this.price = price; }
        public BigDecimal getGstAmount() { return gstAmount; }
        public void setGstAmount(BigDecimal gstAmount) { this.gstAmount = gstAmount; }
    }
}
