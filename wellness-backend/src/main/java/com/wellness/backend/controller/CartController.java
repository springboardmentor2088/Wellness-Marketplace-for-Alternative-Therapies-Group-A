package com.wellness.backend.controller;

import com.wellness.backend.dto.AddCartItemDTO;
import com.wellness.backend.dto.CartItemDTO;
import com.wellness.backend.service.CartService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/cart")
public class CartController {

    @Autowired
    private CartService cartService;

    @PreAuthorize("hasAnyRole('PATIENT', 'PRACTITIONER', 'ADMIN')")
    @GetMapping
    public ResponseEntity<List<CartItemDTO>> getCartItems(Authentication auth) {
        return ResponseEntity.ok(cartService.getCartItems(auth.getName()));
    }

    @PreAuthorize("hasAnyRole('PATIENT', 'PRACTITIONER', 'ADMIN')")
    @PostMapping("/add")
    public ResponseEntity<CartItemDTO> addToCart(@Valid @RequestBody AddCartItemDTO request, Authentication auth) {
        return ResponseEntity.ok(cartService.addToCart(auth.getName(), request));
    }

    @PreAuthorize("hasAnyRole('PATIENT', 'PRACTITIONER', 'ADMIN')")
    @PutMapping("/{productId}/update")
    public ResponseEntity<CartItemDTO> updateQuantity(
            @PathVariable Integer productId,
            @RequestBody Map<String, Integer> body,
            Authentication auth) {
        return ResponseEntity.ok(cartService.updateCartItemQuantityByProductId(auth.getName(), productId, body.get("quantity")));
    }

    @PreAuthorize("hasAnyRole('PATIENT', 'PRACTITIONER', 'ADMIN')")
    @DeleteMapping("/{productId}/remove")
    public ResponseEntity<Void> removeItem(@PathVariable Integer productId, Authentication auth) {
        cartService.removeCartItemByProductId(auth.getName(), productId);
        return ResponseEntity.noContent().build();
    }

    @PreAuthorize("hasAnyRole('PATIENT', 'PRACTITIONER', 'ADMIN')")
    @DeleteMapping("/clear")
    public ResponseEntity<Void> clearCart(Authentication auth) {
        cartService.clearCart(auth.getName());
        return ResponseEntity.noContent().build();
    }
}
