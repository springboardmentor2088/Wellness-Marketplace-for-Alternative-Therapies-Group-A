// ============================================
// ORDER SERVICE - Medicine Orders API Integration
// ============================================

const API_BASE = "http://localhost:8081/api";

const authHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
});

// ---- Get all products ----
export const getAllProducts = async () => {
    const res = await fetch(`${API_BASE}/products`, {
        headers: authHeaders(),
    });
    const result = await res.json();
    if (!res.ok) throw { response: { data: result } };
    return result;
};

// ---- Get available products (in stock) ----
export const getAvailableProducts = async () => {
    const res = await fetch(`${API_BASE}/products/available`, {
        headers: authHeaders(),
    });
    const result = await res.json();
    if (!res.ok) throw { response: { data: result } };
    return result;
};

// ---- Search products ----
export const searchProducts = async (query) => {
    const res = await fetch(`${API_BASE}/products/search?query=${encodeURIComponent(query)}`, {
        headers: authHeaders(),
    });
    const result = await res.json();
    if (!res.ok) throw { response: { data: result } };
    return result;
};

// ---- Get products by category ----
export const getProductsByCategory = async (category) => {
    const res = await fetch(`${API_BASE}/products/category/${category}`, {
        headers: authHeaders(),
    });
    const result = await res.json();
    if (!res.ok) throw { response: { data: result } };
    return result;
};

// ---- Get product by ID ----
export const getProductById = async (productId) => {
    const res = await fetch(`${API_BASE}/products/${productId}`, {
        headers: authHeaders(),
    });
    const result = await res.json();
    if (!res.ok) throw { response: { data: result } };
    return result;
};

// ---- Create order ----
export const createOrder = async (items) => {
    const res = await fetch(`${API_BASE}/orders`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ items }),
    });
    const result = await res.json();
    if (!res.ok) throw { response: { data: result } };
    return result;
};

// ---- Get order history ----
export const getOrderHistory = async () => {
    const res = await fetch(`${API_BASE}/orders/history`, {
        headers: authHeaders(),
    });
    const result = await res.json();
    if (!res.ok) throw { response: { data: result } };
    return result;
};

// ---- Get order details by ID ----
export const getOrderById = async (orderId) => {
    const res = await fetch(`${API_BASE}/orders/${orderId}`, {
        headers: authHeaders(),
    });
    const result = await res.json();
    if (!res.ok) throw { response: { data: result } };
    return result;
};

// ---- Cancel order ----
export const cancelOrder = async (orderId, reason = "") => {
    const res = await fetch(`${API_BASE}/orders/${orderId}/cancel`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ reason }),
    });
    const result = await res.json();
    if (!res.ok) throw { response: { data: result } };
    return result;
};

// ---- Pay for order ----
export const payForOrder = async (orderId) => {
    const res = await fetch(`${API_BASE}/orders/${orderId}/pay`, {
        method: "PUT",
        headers: authHeaders(),
    });
    const result = await res.json();
    if (!res.ok) throw { response: { data: result } };
    return result;
};

// ---- Update order status (admin) ----
export const updateOrderStatus = async (orderId, status) => {
    const res = await fetch(`${API_BASE}/orders/${orderId}/status`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ status }),
    });
    const result = await res.json();
    if (!res.ok) throw { response: { data: result } };
    return result;
};

// ---- Cart management in localStorage ----
export const getCart = () => {
    const cart = localStorage.getItem("cart");
    return cart ? JSON.parse(cart) : [];
};

export const saveCart = (items) => {
    localStorage.setItem("cart", JSON.stringify(items));
};

export const clearCart = () => {
    localStorage.removeItem("cart");
};

export const addToCart = (product, quantity = 1) => {
    const cart = getCart();
    const existingItem = cart.find((item) => item.productId === product.id);

    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({
            productId: product.id,
            productName: product.name,
            price: product.price,
            quantity: quantity,
            category: product.category,
        });
    }

    saveCart(cart);
    return cart;
};

export const removeFromCart = (productId) => {
    const cart = getCart().filter((item) => item.productId !== productId);
    saveCart(cart);
    return cart;
};

export const updateCartItemQuantity = (productId, quantity) => {
    const cart = getCart();
    const item = cart.find((item) => item.productId === productId);

    if (item) {
        if (quantity <= 0) {
            return removeFromCart(productId);
        }
        item.quantity = quantity;
        saveCart(cart);
    }

    return cart;
};

export const getCartTotal = () => {
    const cart = getCart();
    return cart.reduce((total, item) => {
        return total + item.price * item.quantity;
    }, 0);
};

export const getCartItemCount = () => {
    const cart = getCart();
    return cart.reduce((count, item) => count + item.quantity, 0);
};
