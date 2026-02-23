package com.wellness.backend.controller;

import com.wellness.backend.dto.OrderDTO;
import com.wellness.backend.dto.CreateOrderDTO;
import com.wellness.backend.service.OrderService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    @Autowired
    private OrderService orderService;

    // POST /api/orders — Create new order
    @PreAuthorize("hasAnyRole('PATIENT', 'PRACTITIONER', 'ADMIN')")
    @PostMapping
    public ResponseEntity<OrderDTO> createOrder(
            @Valid @RequestBody CreateOrderDTO dto,
            Authentication authentication) {
        String userEmail = authentication.getName();
        OrderDTO order = orderService.createOrder(dto, userEmail);
        return ResponseEntity.status(HttpStatus.CREATED).body(order);
    }

    // GET /api/orders/history — Get order history for logged-in user
    @PreAuthorize("hasAnyRole('PATIENT', 'PRACTITIONER', 'ADMIN')")
    @GetMapping("/history")
    public ResponseEntity<List<OrderDTO>> getOrderHistory(Authentication authentication) {
        String userEmail = authentication.getName();
        List<OrderDTO> orders = orderService.getOrderHistory(userEmail);
        return ResponseEntity.ok(orders);
    }

    // GET /api/orders/{id} — Get order details
    @GetMapping("/{id}")
    public ResponseEntity<OrderDTO> getOrderById(@PathVariable Integer id) {
        OrderDTO order = orderService.getOrderById(id);
        return ResponseEntity.ok(order);
    }

    // PUT /api/orders/{id}/status — Update order status
    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}/status")
    public ResponseEntity<OrderDTO> updateOrderStatus(
            @PathVariable Integer id,
            @RequestBody Map<String, String> body) {
        String status = body.get("status");
        OrderDTO order = orderService.updateOrderStatus(id, status);
        return ResponseEntity.ok(order);
    }

    // PUT /api/orders/{id}/cancel — Cancel order
    @PreAuthorize("hasAnyRole('PATIENT', 'PRACTITIONER', 'ADMIN')")
    @PutMapping("/{id}/cancel")
    public ResponseEntity<OrderDTO> cancelOrder(
            @PathVariable Integer id,
            @RequestBody(required = false) Map<String, String> body) {
        String reason = body != null ? body.get("reason") : "User requested cancellation";
        OrderDTO order = orderService.cancelOrder(id, reason);
        return ResponseEntity.ok(order);
    }

    // PUT /api/orders/{id}/pay — Mark order as paid
    @PreAuthorize("hasAnyRole('PATIENT', 'PRACTITIONER', 'ADMIN')")
    @PutMapping("/{id}/pay")
    public ResponseEntity<OrderDTO> markOrderAsPaid(@PathVariable Integer id) {
        OrderDTO order = orderService.markOrderAsPaid(id);
        return ResponseEntity.ok(order);
    }
}
