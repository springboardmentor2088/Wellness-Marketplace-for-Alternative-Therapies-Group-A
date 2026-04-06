package com.wellness.backend.service;

import com.wellness.backend.dto.OrderDTO;
import com.wellness.backend.dto.OrderItemDTO;
import com.wellness.backend.dto.OrderSummaryDTO;
import com.wellness.backend.dto.CreateOrderDTO;
import com.wellness.backend.enums.PaymentStatus;
import com.wellness.backend.model.CartItem;
import com.wellness.backend.model.Order;
import com.wellness.backend.model.OrderItem;
import com.wellness.backend.model.PaymentTransaction;
import com.wellness.backend.model.Product;
import com.wellness.backend.model.User;
import com.wellness.backend.repository.CartItemRepository;
import com.wellness.backend.repository.OrderRepository;
import com.wellness.backend.repository.PaymentTransactionRepository;
import com.wellness.backend.repository.ProductRepository;
import com.wellness.backend.repository.UserRepository;
import com.wellness.backend.model.WalletTransaction;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class OrderService {

    // Pricing constants
    private static final BigDecimal FREE_DELIVERY_THRESHOLD = new BigDecimal("299");
    private static final BigDecimal DELIVERY_FEE = new BigDecimal("50");
    private static final BigDecimal GST_DIVISOR = new BigDecimal("1.18");
    private static final java.util.Set<String> GST_CATEGORIES = java.util.Set.of(
            "NUTRITION", "HERBAL", "SUPPLEMENT", "MASSAGE", "YOGA", "FITNESS");

    private boolean isGstApplicable(String category) {
        if (category == null) return false;
        String upper = category.toUpperCase();
        return GST_CATEGORIES.stream().anyMatch(upper::contains);
    }

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PaymentTransactionRepository paymentTransactionRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private AuditLogService auditLogService;

    @Autowired
    private SessionNotificationService notificationService;

    @Autowired
    private CartItemRepository cartItemRepository;

    @Autowired
    private WalletService walletService;

    @Autowired
    private com.wellness.backend.repository.SellerEarningRepository sellerEarningRepository;

    // ================= CREATE ORDER =================
    @Transactional
    public OrderDTO createOrder(CreateOrderDTO dto, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Order order = new Order();
        order.setUser(user);
        order.setPaymentStatus(PaymentStatus.PENDING);
        order.setStatus(Order.OrderStatus.PLACED);

        // Resolve delivery address: prefer DTO address, fall back to user profile address
        String address = dto.getDeliveryAddress();
        if (address == null || address.trim().isEmpty()) {
            address = user.getAddress();
        }
        if (address == null || address.trim().isEmpty()) {
            throw new RuntimeException("Delivery address is required. Please provide an address to proceed.");
        }
        order.setDeliveryAddress(address);

        // Mock delivery details
        order.setEstimatedDeliveryDate(LocalDateTime.now().plusDays(5));
        order.setTrackingNumber("TRK" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        order.setCourierPartner("BlueDart");

        // Create order items from DTO
        for (OrderItemDTO itemDTO : dto.getItems()) {
            Product product = productRepository.findById(itemDTO.getProductId())
                    .orElseThrow(() -> new RuntimeException("Product not found: " + itemDTO.getProductId()));

            if (product.getStock() < itemDTO.getQuantity()) {
                 throw new RuntimeException("Insufficient stock for product: " + product.getName());
            }

            // Decrement Stock
            product.setStock(product.getStock() - itemDTO.getQuantity());
            productRepository.save(product);

            OrderItem orderItem = new OrderItem();
            orderItem.setProduct(product);
            orderItem.setQuantity(itemDTO.getQuantity());
            orderItem.setPrice(product.getPrice());
            order.addItem(orderItem);
        }

        order.calculateTotal();

        // Backend-calculated pricing (GST extraction + delivery)
        BigDecimal subtotal = order.getSubtotal();
        BigDecimal totalGst = BigDecimal.ZERO;
        for (OrderItem item : order.getOrderItems()) {
            String category = item.getProduct().getCategory();
            if (isGstApplicable(category)) {
                BigDecimal itemTotal = item.getPrice().multiply(new BigDecimal(item.getQuantity()));
                BigDecimal base = itemTotal.divide(GST_DIVISOR, 2, RoundingMode.HALF_UP);
                totalGst = totalGst.add(itemTotal.subtract(base));
            }
        }
        BigDecimal deliveryCharge = subtotal.compareTo(FREE_DELIVERY_THRESHOLD) >= 0 ? BigDecimal.ZERO : DELIVERY_FEE;
        order.setGstAmount(totalGst.setScale(2, RoundingMode.HALF_UP));
        order.setDeliveryCharge(deliveryCharge);
        order.setTotalAmount(subtotal.add(deliveryCharge));

        Order saved = orderRepository.save(order);
        
        notificationService.notifyOrderStatusChanged(
                saved.getUser().getId(), 
                saved.getId().toString(), 
                "PLACED"
        );
        
        return mapToDTO(saved);
    }

    // ================= GET ORDER HISTORY =================
    @Transactional(readOnly = true)
    public List<OrderDTO> getOrderHistory(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return orderRepository.findByUser_IdOrderByOrderDateDesc(user.getId())
                .stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    // ================= GET ALL ORDERS =================
    @Transactional(readOnly = true)
    public List<OrderDTO> getAllOrders() {
        return orderRepository.findAllByOrderByOrderDateDesc()
                .stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    // ================= GET ORDER BY ID =================
    @Transactional(readOnly = true)
    public OrderDTO getOrderById(Integer id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Order not found"));
        return mapToDTO(order);
    }

    // ================= UPDATE ORDER STATUS =================
    @Transactional
    public OrderDTO updateOrderStatus(Integer id, String status) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Order not found"));
        order.setStatus(Order.OrderStatus.valueOf(status.toUpperCase()));
        Order saved = orderRepository.save(order);

        auditLogService.logAction(
                order.getUser().getId(),
                "ORDER_STATUS_UPDATE",
                "Order",
                order.getId().toString(),
                "Status: " + status);

        notificationService.notifyOrderStatusChanged(
                saved.getUser().getId(), 
                saved.getId().toString(), 
                saved.getStatus().name()
        );

        return mapToDTO(saved);
    }

    // ================= CANCEL ORDER =================
    @Transactional
    public OrderDTO cancelOrder(Integer id, String reason) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Order not found"));
        
        if (order.getStatus() != Order.OrderStatus.CANCELLED) {
            order.setStatus(Order.OrderStatus.CANCELLED);
            
            // Restore product stock
            if (order.getOrderItems() != null) {
                for (OrderItem item : order.getOrderItems()) {
                    Product product = item.getProduct();
                    if (product != null) {
                        int currentStock = product.getStock() != null ? product.getStock() : 0;
                        product.setStock(currentStock + item.getQuantity());
                        productRepository.save(product);
                    }
                }
            }
        }
        
        // If the order has not been paid for successfully, delete it.
        // The user wants abandoned checkouts to NOT be placed (hard delete).
        if (order.getPaymentStatus() == PaymentStatus.PENDING) {
            // Remove linked payment transactions to prevent foreign key errors
            List<PaymentTransaction> txs = paymentTransactionRepository.findByOrderId(order.getId());
            if (!txs.isEmpty()) {
                paymentTransactionRepository.deleteAll(txs);
            }
            
            orderRepository.delete(order);
            
            OrderDTO dummy = new OrderDTO();
            dummy.setId(id);
            dummy.setStatus(Order.OrderStatus.CANCELLED);
            return dummy;
        }

        Order saved = orderRepository.save(order);

        // Refund to wallet if the order was paid
        if (order.getPaymentStatus() == PaymentStatus.PAID) {
            BigDecimal refundAmount = order.getTotalAmount();
            walletService.deposit(
                    order.getUser(),
                    refundAmount,
                    "Refund for cancelled order #" + order.getId(),
                    WalletTransaction.Type.REFUND);
            order.setPaymentStatus(PaymentStatus.REFUNDED);
            saved = orderRepository.save(order);

            notificationService.notifyRefundProcessed(order.getUser().getId(), refundAmount);
        }

        auditLogService.logAction(
                order.getUser().getId(),
                "ORDER_CANCELLED",
                "Order",
                order.getId().toString(),
                "Reason: " + reason);

        notificationService.notifyOrderStatusChanged(
                saved.getUser().getId(), 
                saved.getId().toString(), 
                "CANCELLED"
        );

        return mapToDTO(saved);
    }

    // ================= MARK ORDER AS PAID =================
    @Transactional
    public OrderDTO markOrderAsPaid(Integer id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Order not found"));
        order.setPaymentStatus(PaymentStatus.PAID);
        Order saved = orderRepository.save(order);

        // Record Seller Earnings (20% Platform Fee)
        if (saved.getOrderItems() != null) {
            for (com.wellness.backend.model.OrderItem item : saved.getOrderItems()) {
                if (item.getProduct() != null && item.getProduct().getSeller() != null) {
                    BigDecimal itemTotal = item.getPrice().multiply(new java.math.BigDecimal(item.getQuantity()));
                    BigDecimal platformFee = itemTotal.multiply(new java.math.BigDecimal("0.20"));
                    BigDecimal netAmount = itemTotal.subtract(platformFee);

                    com.wellness.backend.model.SellerEarning earning = new com.wellness.backend.model.SellerEarning();
                    earning.setSeller(item.getProduct().getSeller());
                    earning.setOrder(saved);
                    earning.setAmount(itemTotal);
                    earning.setPlatformFee(platformFee);
                    earning.setNetAmount(netAmount);
                    earning.setPayoutStatus(com.wellness.backend.model.SellerEarning.PayoutStatus.PENDING);
                    sellerEarningRepository.save(earning);
                }
            }
        }

        auditLogService.logAction(
                order.getUser().getId(),
                "ORDER_PAYMENT_UPDATE",
                "Order",
                order.getId().toString(),
                "Status: PAID");

        return mapToDTO(saved);
    }

    // ================= LEGACY METHODS (kept for other callers) =================
    public List<Order> getUserOrders(Integer userId) {
        return orderRepository.findByUser_IdOrderByOrderDateDesc(userId);
    }

    @Transactional
    public void updatePaymentStatus(Integer orderId, PaymentStatus status) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));
        order.setPaymentStatus(status);
        orderRepository.save(order);

        auditLogService.logAction(
                order.getUser().getId(),
                "ORDER_PAYMENT_UPDATE",
                "Order",
                order.getId().toString(),
                "Status: " + status);
    }

    public List<Order> getOrdersByStatus(PaymentStatus status) {
        return orderRepository.findByPaymentStatus(status);
    }

    // ================= ORDER SUMMARY (from DB cart) =================
    @Transactional(readOnly = true)
    public OrderSummaryDTO getOrderSummary(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));
        List<CartItem> cartItems = cartItemRepository.findByUser(user);
        if (cartItems.isEmpty()) {
            throw new RuntimeException("Cart is empty");
        }
        return calculateSummary(cartItems);
    }

    private OrderSummaryDTO calculateSummary(List<CartItem> cartItems) {
        List<OrderSummaryDTO.ItemSummaryDTO> itemDtos = new ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO;
        BigDecimal totalGst = BigDecimal.ZERO;

        for (CartItem ci : cartItems) {
            Product product = ci.getProduct();
            BigDecimal itemTotal = product.getPrice().multiply(new BigDecimal(ci.getQuantity()));
            subtotal = subtotal.add(itemTotal);

            BigDecimal itemGst = BigDecimal.ZERO;
            String category = product.getCategory();
            if (isGstApplicable(category)) {
                BigDecimal base = itemTotal.divide(GST_DIVISOR, 2, RoundingMode.HALF_UP);
                itemGst = itemTotal.subtract(base);
            }
            totalGst = totalGst.add(itemGst);

            OrderSummaryDTO.ItemSummaryDTO item = new OrderSummaryDTO.ItemSummaryDTO();
            item.setProductName(product.getName());
            item.setCategory(product.getCategory());
            item.setQuantity(ci.getQuantity());
            item.setPrice(product.getPrice());
            item.setGstAmount(itemGst.setScale(2, RoundingMode.HALF_UP));
            itemDtos.add(item);
        }

        BigDecimal deliveryCharge = subtotal.compareTo(FREE_DELIVERY_THRESHOLD) >= 0 ? BigDecimal.ZERO : DELIVERY_FEE;

        OrderSummaryDTO dto = new OrderSummaryDTO();
        dto.setItems(itemDtos);
        dto.setSubtotal(subtotal.setScale(2, RoundingMode.HALF_UP));
        dto.setGstAmount(totalGst.setScale(2, RoundingMode.HALF_UP));
        dto.setDeliveryCharge(deliveryCharge);
        dto.setTotalAmount(subtotal.add(deliveryCharge).setScale(2, RoundingMode.HALF_UP));
        return dto;
    }

    // ================= ORDER SUMMARY (from provided items — for Buy Now) =================
    @Transactional(readOnly = true)
    public OrderSummaryDTO calculateSummaryFromItems(List<OrderItemDTO> items) {
        if (items == null || items.isEmpty()) {
            throw new RuntimeException("No items provided");
        }
        List<OrderSummaryDTO.ItemSummaryDTO> itemDtos = new ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO;
        BigDecimal totalGst = BigDecimal.ZERO;

        for (OrderItemDTO oi : items) {
            Product product = productRepository.findById(oi.getProductId())
                    .orElseThrow(() -> new RuntimeException("Product not found: " + oi.getProductId()));
            BigDecimal itemTotal = product.getPrice().multiply(new BigDecimal(oi.getQuantity()));
            subtotal = subtotal.add(itemTotal);

            BigDecimal itemGst = BigDecimal.ZERO;
            String category = product.getCategory();
            if (isGstApplicable(category)) {
                BigDecimal base = itemTotal.divide(GST_DIVISOR, 2, RoundingMode.HALF_UP);
                itemGst = itemTotal.subtract(base);
            }
            totalGst = totalGst.add(itemGst);

            OrderSummaryDTO.ItemSummaryDTO item = new OrderSummaryDTO.ItemSummaryDTO();
            item.setProductName(product.getName());
            item.setCategory(product.getCategory());
            item.setQuantity(oi.getQuantity());
            item.setPrice(product.getPrice());
            item.setGstAmount(itemGst.setScale(2, RoundingMode.HALF_UP));
            itemDtos.add(item);
        }

        BigDecimal deliveryCharge = subtotal.compareTo(FREE_DELIVERY_THRESHOLD) >= 0 ? BigDecimal.ZERO : DELIVERY_FEE;

        OrderSummaryDTO dto = new OrderSummaryDTO();
        dto.setItems(itemDtos);
        dto.setSubtotal(subtotal.setScale(2, RoundingMode.HALF_UP));
        dto.setGstAmount(totalGst.setScale(2, RoundingMode.HALF_UP));
        dto.setDeliveryCharge(deliveryCharge);
        dto.setTotalAmount(subtotal.add(deliveryCharge).setScale(2, RoundingMode.HALF_UP));
        return dto;
    }

    // ================= MAPPING =================
    private OrderDTO mapToDTO(Order order) {
        OrderDTO dto = new OrderDTO();
        dto.setId(order.getId());
        dto.setUserId(order.getUser().getId());
        dto.setTotalAmount(order.getTotalAmount());
        dto.setStatus(order.getStatus());
        dto.setPaymentStatus(order.getPaymentStatus());
        dto.setOrderDate(order.getOrderDate());
        dto.setUpdatedAt(order.getUpdatedAt());
        dto.setDeliveryAddress(order.getDeliveryAddress());
        dto.setEstimatedDeliveryDate(order.getEstimatedDeliveryDate());
        dto.setTrackingNumber(order.getTrackingNumber());
        dto.setCourierPartner(order.getCourierPartner());

        if (order.getOrderItems() != null) {
            List<OrderItemDTO> itemDTOs = order.getOrderItems().stream().map(item -> {
                OrderItemDTO itemDTO = new OrderItemDTO();
                itemDTO.setId(item.getId());
                itemDTO.setProductId(item.getProduct().getId());
                itemDTO.setProductName(item.getProduct().getName());
                itemDTO.setProductCategory(item.getProduct().getCategory());
                itemDTO.setQuantity(item.getQuantity());
                itemDTO.setPrice(item.getPrice());
                itemDTO.setSubtotal(item.getPrice().multiply(new BigDecimal(item.getQuantity())));
                return itemDTO;
            }).collect(Collectors.toList());
            dto.setItems(itemDTOs);
        }

        return dto;
    }
}
