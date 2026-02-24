// ============================================
// WEBSOCKET SERVICE - Real-time Notifications
// ============================================

import SockJS from "sockjs-client";
import Stomp from "stompjs";

let stompClient = null;
let isConnected = false;
let subscriptions = {};

const API_WS = "http://localhost:8081/ws";

// ---- Initialize WebSocket Connection ----
export const connectWebSocket = (userId, onMessageReceived) => {
  return new Promise((resolve, reject) => {
    if (isConnected && stompClient) {
      resolve(stompClient);
      return;
    }

    const socket = new SockJS(API_WS);
    stompClient = Stomp.over(socket);

    stompClient.connect(
      {},
      (frame) => {
        console.log("WebSocket connected:", frame);
        isConnected = true;

        // Subscribe to user-specific notifications
        subscribeToUserUpdates(userId, onMessageReceived);
        subscribeToSessionUpdates(userId, onMessageReceived);
        subscribeToOrderUpdates(userId, onMessageReceived);

        resolve(stompClient);
      },
      (error) => {
        console.error("WebSocket connection error:", error);
        isConnected = false;
        reject(error);
      }
    );
  });
};

// ---- Subscribe to User Notifications ----
export const subscribeToUserUpdates = (userId, callback) => {
  if (!stompClient || !isConnected) {
    console.warn("WebSocket not connected");
    return;
  }

  const subscription = stompClient.subscribe(`/topic/user/${userId}`, (message) => {
    try {
      const data = JSON.parse(message.body);
      console.log("User notification received:", data);
      if (callback) callback(data);
    } catch (error) {
      console.error("Error parsing WebSocket message:", error);
    }
  });

  subscriptions[`user-${userId}`] = subscription;
};

// ---- Subscribe to Session Updates ----
export const subscribeToSessionUpdates = (userId, callback) => {
  if (!stompClient || !isConnected) {
    console.warn("WebSocket not connected");
    return;
  }

  const subscription = stompClient.subscribe(`/topic/sessions/${userId}`, (message) => {
    try {
      const data = JSON.parse(message.body);
      console.log("Session update received:", data);
      if (callback) callback(data);
    } catch (error) {
      console.error("Error parsing WebSocket message:", error);
    }
  });

  subscriptions[`sessions-${userId}`] = subscription;
};

// ---- Subscribe to Order Updates ----
export const subscribeToOrderUpdates = (userId, callback) => {
  if (!stompClient || !isConnected) {
    console.warn("WebSocket not connected");
    return;
  }

  const subscription = stompClient.subscribe(`/topic/orders/${userId}`, (message) => {
    try {
      const data = JSON.parse(message.body);
      console.log("Order update received:", data);
      if (callback) callback(data);
    } catch (error) {
      console.error("Error parsing WebSocket message:", error);
    }
  });

  subscriptions[`orders-${userId}`] = subscription;
};

// ---- Subscribe to Practitioner Updates ----
export const subscribeToPractitionerUpdates = (practitionerId, callback) => {
  if (!stompClient || !isConnected) {
    console.warn("WebSocket not connected");
    return;
  }

  const subscription = stompClient.subscribe(`/topic/practitioner/${practitionerId}`, (message) => {
    try {
      const data = JSON.parse(message.body);
      console.log("Practitioner update received:", data);
      if (callback) callback(data);
    } catch (error) {
      console.error("Error parsing WebSocket message:", error);
    }
  });

  subscriptions[`practitioner-${practitionerId}`] = subscription;
};

// ---- Send Session Subscription Request ----
export const requestSessionSubscription = (userId) => {
  if (!stompClient || !isConnected) {
    console.warn("WebSocket not connected");
    return;
  }

  stompClient.send("/app/session/subscribe", {}, JSON.stringify({ userId }));
};

// ---- Send Notification Subscription Request ----
export const requestNotificationSubscription = (userId) => {
  if (!stompClient || !isConnected) {
    console.warn("WebSocket not connected");
    return;
  }

  stompClient.send("/app/notifications/subscribe", {}, JSON.stringify({ userId }));
};

// ---- Send Order Subscription Request ----
export const requestOrderSubscription = (userId) => {
  if (!stompClient || !isConnected) {
    console.warn("WebSocket not connected");
    return;
  }

  stompClient.send("/app/orders/subscribe", {}, JSON.stringify({ userId }));
};

// ---- Send Practitioner Subscription Request ----
export const requestPractitionerSubscription = (practitionerId) => {
  if (!stompClient || !isConnected) {
    console.warn("WebSocket not connected");
    return;
  }

  stompClient.send("/app/availability/subscribe", {}, JSON.stringify({ practitionerId }));
};

// ---- Heartbeat/Keep-Alive ----
export const sendPing = () => {
  if (!stompClient || !isConnected) {
    console.warn("WebSocket not connected");
    return;
  }

  stompClient.send(
    "/app/ping",
    {},
    JSON.stringify({ timestamp: new Date().toISOString() })
  );
};

// ---- Disconnect WebSocket ----
export const disconnectWebSocket = () => {
  // Unsubscribe from all topics
  Object.values(subscriptions).forEach((subscription) => {
    if (subscription) {
      subscription.unsubscribe();
    }
  });
  subscriptions = {};

  // Disconnect client
  if (stompClient && isConnected) {
    stompClient.disconnect(() => {
      console.log("WebSocket disconnected");
      isConnected = false;
      stompClient = null;
    });
  }
};

// ---- Check Connection Status ----
export const isWebSocketConnected = () => {
  return isConnected && stompClient !== null;
};

// ---- Unsubscribe from Specific Topic ----
export const unsubscribeFromTopic = (subscriptionKey) => {
  if (subscriptions[subscriptionKey]) {
    subscriptions[subscriptionKey].unsubscribe();
    delete subscriptions[subscriptionKey];
    console.log(`Unsubscribed from: ${subscriptionKey}`);
  }
};
