package com.wellness.backend.dto;

import java.math.BigDecimal;

public class CartItemDTO {
    private Long id;
    private Integer productId;
    private String productName;
    private String category;
    private BigDecimal price;
    private Integer quantity;

    public CartItemDTO() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Integer getProductId() { return productId; }
    public void setProductId(Integer productId) { this.productId = productId; }
    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }
    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }
}
