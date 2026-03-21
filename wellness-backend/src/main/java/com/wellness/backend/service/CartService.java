package com.wellness.backend.service;

import com.wellness.backend.dto.AddCartItemDTO;
import com.wellness.backend.dto.CartItemDTO;
import com.wellness.backend.model.CartItem;
import com.wellness.backend.model.Product;
import com.wellness.backend.model.User;
import com.wellness.backend.repository.CartItemRepository;
import com.wellness.backend.repository.ProductRepository;
import com.wellness.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class CartService {

    @Autowired
    private CartItemRepository cartItemRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<CartItemDTO> getCartItems(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return cartItemRepository.findByUser(user).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public CartItemDTO addToCart(String userEmail, AddCartItemDTO dto) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));
        Product product = productRepository.findById(dto.getProductId())
                .orElseThrow(() -> new RuntimeException("Product not found"));

        CartItem cartItem = cartItemRepository.findByUserAndProductId(user, product.getId())
                .orElse(new CartItem(user, product, 0));

        int newQuantity = cartItem.getQuantity() + dto.getQuantity();

        if (product.getStock() < newQuantity) {
            throw new RuntimeException("Not enough stock available");
        }

        cartItem.setQuantity(newQuantity);
        return convertToDTO(cartItemRepository.save(cartItem));
    }

    @Transactional
    public CartItemDTO updateCartItemQuantityByProductId(String userEmail, Integer productId, Integer quantity) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));
        CartItem cartItem = cartItemRepository.findByUserAndProductId(user, productId)
                .orElseThrow(() -> new RuntimeException("Cart item not found"));

        if (quantity <= 0) {
            cartItemRepository.delete(cartItem);
            return null;
        }

        if (cartItem.getProduct().getStock() < quantity) {
            throw new RuntimeException("Not enough stock available");
        }

        cartItem.setQuantity(quantity);
        return convertToDTO(cartItemRepository.save(cartItem));
    }

    @Transactional
    public CartItemDTO updateCartItemQuantity(String userEmail, Long cartItemId, Integer quantity) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));
        CartItem cartItem = cartItemRepository.findById(cartItemId)
                .orElseThrow(() -> new RuntimeException("Cart item not found"));

        if (!cartItem.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized to modify this cart item");
        }

        if (quantity <= 0) {
            cartItemRepository.delete(cartItem);
            return null;
        }

        if (cartItem.getProduct().getStock() < quantity) {
            throw new RuntimeException("Not enough stock available");
        }

        cartItem.setQuantity(quantity);
        return convertToDTO(cartItemRepository.save(cartItem));
    }

    @Transactional
    public void removeCartItem(String userEmail, Long cartItemId) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));
        CartItem cartItem = cartItemRepository.findById(cartItemId)
                .orElseThrow(() -> new RuntimeException("Cart item not found"));

        if (!cartItem.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized to modify this cart item");
        }

        cartItemRepository.delete(cartItem);
    }
    
    @Transactional
    public void removeCartItemByProductId(String userEmail, Integer productId) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));
        CartItem cartItem = cartItemRepository.findByUserAndProductId(user, productId)
                .orElseThrow(() -> new RuntimeException("Cart item not found"));

        cartItemRepository.delete(cartItem);
    }

    @Transactional
    public void clearCart(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));
        cartItemRepository.deleteByUser(user);
    }

    private CartItemDTO convertToDTO(CartItem item) {
        CartItemDTO dto = new CartItemDTO();
        dto.setId(item.getId());
        dto.setProductId(item.getProduct().getId());
        dto.setProductName(item.getProduct().getName());
        dto.setCategory(item.getProduct().getCategory());
        dto.setPrice(item.getProduct().getPrice());
        dto.setQuantity(item.getQuantity());
        return dto;
    }
}
