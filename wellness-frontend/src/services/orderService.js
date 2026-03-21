// ============================================
// ORDER SERVICE - Medicine Orders API Integration
// ============================================

const API_BASE = "/api";

const authHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
});

// ---- Get all products ----
export const getAllProducts = async () => {
    const res = await fetch(`${API_BASE}/products`, {
        headers: authHeaders(),
    });
    if (!res.ok) {
        const errorText = await res.text();
        throw { response: { data: { message: errorText || res.statusText } } };
    }
    return await res.json();
};

// ---- Get all orders (Admin) ----
export const getAllOrders = async () => {
    const res = await fetch(`${API_BASE}/orders/all`, {
        headers: authHeaders(),
    });
    if (!res.ok) {
        const errorText = await res.text();
        throw { response: { data: { message: errorText || res.statusText } } };
    }
    return await res.json();
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
export const createOrder = async (items, deliveryAddress) => {
    const body = { items };
    if (deliveryAddress) {
        body.deliveryAddress = deliveryAddress;
    }
    const res = await fetch(`${API_BASE}/orders`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(body),
    });
    const text = await res.text();
    const result = text ? JSON.parse(text) : { message: "Server returned status " + res.status };
    if (!res.ok) throw { response: { data: result } };
    return result;
};

// ---- Get order history ----
export const getOrderHistory = async () => {
    const res = await fetch(`${API_BASE}/orders/history?t=${Date.now()}`, {
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
    if (!res.ok) {
        const errorText = await res.text();
        throw { response: { data: { message: errorText || res.statusText } } };
    }
    return await res.json();
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

// ---- Cart management via API ----
export const getCart = async () => {
    const res = await fetch(`${API_BASE}/cart`, {
        headers: authHeaders(),
    });
    const result = await res.json();
    if (!res.ok) throw { response: { data: result } };
    return result;
};

export const clearCart = async () => {
    const res = await fetch(`${API_BASE}/cart/clear`, {
        method: "DELETE",
        headers: authHeaders(),
    });
    if (!res.ok) {
        try {
            const result = await res.json();
            throw { response: { data: result } };
        } catch(e) { throw e; }
    }
};

export const addToCart = async (product, quantity = 1) => {
    const res = await fetch(`${API_BASE}/cart/add`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ productId: product.id, quantity }),
    });
    const result = await res.json();
    if (!res.ok) throw { response: { data: result } };
    return result;
};

export const removeFromCart = async (productId) => {
    const res = await fetch(`${API_BASE}/cart/${productId}/remove`, {
        method: "DELETE",
        headers: authHeaders(),
    });
    if (!res.ok) {
        try {
            const result = await res.json();
            throw { response: { data: result } };
        } catch(e) { throw e; }
    }
};

export const updateCartItemQuantity = async (productId, quantity) => {
    if (quantity <= 0) {
        return removeFromCart(productId);
    }
    const res = await fetch(`${API_BASE}/cart/${productId}/update`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ quantity }),
    });
    const result = await res.json();
    if (!res.ok) throw { response: { data: result } };
    return result;
};

export const getCartTotal = (cartItems) => {
    return cartItems.reduce((total, item) => {
        return total + item.price * item.quantity;
    }, 0);
};

export const getOrderSummary = async () => {
    const res = await fetch(`${API_BASE}/orders/summary`, {
        headers: authHeaders(),
    });
    const result = await res.json();
    if (!res.ok) throw { response: { data: result } };
    return result;
};

export const calculateOrderSummary = async (items) => {
    const res = await fetch(`${API_BASE}/orders/calculate`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ items }),
    });
    const result = await res.json();
    if (!res.ok) throw { response: { data: result } };
    return result;
};

export const getCartItemCount = async () => {
    try {
        const cart = await getCart();
        return cart.reduce((count, item) => count + item.quantity, 0);
    } catch (e) {
        return 0;
    }
};

// ---- Admin: Create product ----
export const createProduct = async (productData) => {
    const res = await fetch(`${API_BASE}/products`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(productData),
    });
    const result = await res.json();
    if (!res.ok) throw { response: { data: result } };
    return result;
};

// ---- Admin: Update product ----
export const updateProduct = async (productId, productData) => {
    const res = await fetch(`${API_BASE}/products/${productId}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(productData),
    });
    const result = await res.json();
    if (!res.ok) throw { response: { data: result } };
    return result;
};

// ---- Admin: Delete product ----
export const deleteProduct = async (productId) => {
    const res = await fetch(`${API_BASE}/products/${productId}`, {
        method: "DELETE",
        headers: authHeaders(),
    });
    if (!res.ok) {
        const result = await res.json();
        throw { response: { data: result } };
    }
};

