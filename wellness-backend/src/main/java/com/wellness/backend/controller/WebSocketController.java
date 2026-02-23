package com.wellness.backend.controller;

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Controller
public class WebSocketController {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    // ================= SESSION UPDATES =================
    
    /**
     * Endpoint: /app/session/subscribe
     * Allows users to subscribe to session updates
     * Message format: { "userId": 123 }
     */
    @MessageMapping("/session/subscribe")
    public void subscribeToSessions(Map<String, Object> message) {
        Integer userId = ((Number) message.get("userId")).intValue();
        
        // Send confirmation
        Map<String, Object> response = new HashMap<>();
        response.put("status", "subscribed");
        response.put("channel", "session-updates-" + userId);
        response.put("timestamp", LocalDateTime.now().toString());
        
        messagingTemplate.convertAndSendToUser(
                userId.toString(),
                "/queue/session-subscription",
                response);
    }

    // ================= NOTIFICATION UPDATES =================
    
    /**
     * Endpoint: /app/notifications/subscribe
     * Allows users to subscribe to general notifications
     */
    @MessageMapping("/notifications/subscribe")
    public void subscribeToNotifications(Map<String, Object> message) {
        Integer userId = ((Number) message.get("userId")).intValue();
        
        Map<String, Object> response = new HashMap<>();
        response.put("status", "subscribed");
        response.put("channel", "notifications-" + userId);
        response.put("timestamp", LocalDateTime.now().toString());
        
        messagingTemplate.convertAndSendToUser(
                userId.toString(),
                "/queue/notification-subscription",
                response);
    }

    // ================= HEARTBEAT / KEEP-ALIVE =================
    
    /**
     * Endpoint: /app/ping
     * Keeps the connection alive
     */
    @MessageMapping("/ping")
    @SendTo("/topic/pong")
    public Map<String, Object> ping(Map<String, Object> message) {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "pong");
        response.put("timestamp", LocalDateTime.now().toString());
        response.put("clientTimestamp", message.get("timestamp"));
        return response;
    }

    // ================= ORDER UPDATES =================
    
    /**
     * Endpoint: /app/orders/subscribe
     * Allows users to subscribe to order updates
     */
    @MessageMapping("/orders/subscribe")
    public void subscribeToOrders(Map<String, Object> message) {
        Integer userId = ((Number) message.get("userId")).intValue();
        
        Map<String, Object> response = new HashMap<>();
        response.put("status", "subscribed");
        response.put("channel", "orders-" + userId);
        response.put("timestamp", LocalDateTime.now().toString());
        
        messagingTemplate.convertAndSendToUser(
                userId.toString(),
                "/queue/order-subscription",
                response);
    }

    // ================= PRACTITIONER AVAILABILITY UPDATES =================
    
    /**
     * Endpoint: /app/availability/subscribe
     * Allows practitioners to get availability updates
     */
    @MessageMapping("/availability/subscribe")
    public void subscribeToAvailability(Map<String, Object> message) {
        Integer practitionerId = ((Number) message.get("practitionerId")).intValue();
        
        Map<String, Object> response = new HashMap<>();
        response.put("status", "subscribed");
        response.put("channel", "availability-" + practitionerId);
        response.put("timestamp", LocalDateTime.now().toString());
        
        messagingTemplate.convertAndSendToUser(
                practitionerId.toString(),
                "/queue/availability-subscription",
                response);
    }
}
