package com.wellness.backend.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public class CreateOrderDTO {

    @Valid
    @NotEmpty(message = "Order must contain at least one item")
    private List<OrderItemDTO> items;

    // Constructors
    public CreateOrderDTO() {}

    public CreateOrderDTO(List<OrderItemDTO> items) {
        this.items = items;
    }

    private String deliveryAddress;

    // Getters and Setters
    public List<OrderItemDTO> getItems() {
        return items;
    }

    public void setItems(List<OrderItemDTO> items) {
        this.items = items;
    }

    public String getDeliveryAddress() {
        return deliveryAddress;
    }

    public void setDeliveryAddress(String deliveryAddress) {
        this.deliveryAddress = deliveryAddress;
    }
}
