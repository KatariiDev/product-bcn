// Supabase REST client không phụ thuộc thư viện ngoài (Zero Dependency)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://uljpcofqhdgmwgwgbuzy.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_QaLj1RpOMWz4Jqj2SXokiw_tFD8HpQG';

const headers = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

// Dọn dẹp cache đơn hàng cũ trên localStorage để tránh lộ dữ liệu giữa các tài khoản
try {
  localStorage.removeItem('aobcn_orders_cache');
} catch (e) {}

export const supabaseApi = {

  // ── SẢN PHẨM ──────────────────────────────────────────────────────────────

  async getProducts() {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/products?select=*&order=created_at.desc`, { headers });
      if (!res.ok) {
        const err = await res.text();
        console.error('[Supabase] getProducts error:', res.status, err);
        return null;
      }
      return await res.json();
    } catch (err) {
      console.warn('[Supabase] getProducts network error:', err);
      return null;
    }
  },

  async upsertProduct(product) {
    try {
      const payload = {
        id: product.id,
        name: product.name,
        tag: product.tag || '',
        category: product.category || 'tshirt',
        price: Number(product.price),
        old_price: product.oldPrice ? Number(product.oldPrice) : null,
        sizes: product.sizes || ['S', 'M', 'L', 'XL'],
        genders: product.genders || ['Male', 'Female'],
        in_stock: product.inStock !== false,
        badge: product.badge || '',
        image: product.image || '',
        images: product.images || [],
        description: product.description || ''
      };
      const res = await fetch(`${SUPABASE_URL}/rest/v1/products`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.text();
        console.error('[Supabase] upsertProduct error:', res.status, err);
        return null;
      }
      return await res.json();
    } catch (err) {
      console.warn('[Supabase] upsertProduct network error:', err);
      return null;
    }
  },

  async deleteProduct(productId) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${productId}`, {
        method: 'DELETE',
        headers
      });
      return res.ok;
    } catch (err) {
      console.warn('[Supabase] deleteProduct error:', err);
      return false;
    }
  },

  // ── ĐƠN HÀNG ──────────────────────────────────────────────────────────────

  // Tạo đơn hàng mới và lưu thẳng lên Supabase + localStorage cache
  async createOrder(order) {
    // Payload gửi lên Supabase (KHÔNG có id - để Supabase tự sinh)
    const supabasePayload = {
      order_code: Number(order.orderCode),
      zalo_id: String(order.zaloId || 'guest'),
      name: order.name || 'Khách hàng BCN',
      product_name: order.productName,
      gender: order.gender,
      size: order.size,
      quantity: Number(order.quantity) || 1,
      price: Number(order.price),
      total_price: Number(order.totalPrice),
      status: 'PENDING',
      created_at: new Date().toISOString()
    };

    // Object tạm cho localStorage (có id local để render UI)
    const localObj = {
      id: `ord-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      ...supabasePayload
    };

    console.log('[Supabase] createOrder payload:', supabasePayload);

    // 1. Đẩy trực tiếp lên Supabase
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
        method: 'POST',
        headers,
        body: JSON.stringify(supabasePayload)
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error('[Supabase] createOrder FAILED:', res.status, errText);
      } else {
        const result = await res.json();
        console.log('[Supabase] createOrder SUCCESS:', result);
        window.dispatchEvent(new Event('orders_updated'));
        return Array.isArray(result) && result.length > 0 ? result[0] : result;
      }
    } catch (err) {
      console.error('[Supabase] createOrder network error:', err);
    }

    return localObj;
  },

  // Lấy TẤT CẢ đơn hàng từ Supabase (Admin Dashboard only)
  async getOrders() {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?select=*&order=created_at.desc`, { headers });
      if (res.ok) {
        const remoteOrders = await res.json();
        if (Array.isArray(remoteOrders)) {
          return remoteOrders;
        }
      } else {
        const errText = await res.text();
        console.error('[Supabase] getOrders error:', res.status, errText);
      }
    } catch (err) {
      console.warn('[Supabase] getOrders network error:', err);
    }
    return [];
  },

  // Lấy đơn hàng CHỈ của người dùng hiện tại (User page bảo mật)
  async getUserOrders(zaloId) {
    if (!zaloId) return [];
    const targetZaloId = String(zaloId);

    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/orders?zalo_id=eq.${targetZaloId}&select=*&order=created_at.desc`,
        { headers }
      );
      if (res.ok) {
        const remoteOrders = await res.json();
        if (Array.isArray(remoteOrders)) {
          return remoteOrders;
        }
      }
    } catch (err) {
      console.warn('[Supabase] getUserOrders network error:', err);
    }

    return [];
  },

  // Hủy đơn hàng (cập nhật trạng thái trực tiếp trên Supabase)
  async cancelOrder(orderCode, orderId) {
    try {
      if (!orderCode && !orderId) {
        console.warn('[Supabase] cancelOrder: thiếu mã đơn hàng');
        return false;
      }
      const matchQuery = orderCode ? `order_code=eq.${orderCode}` : `id=eq.${orderId}`;
      const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?${matchQuery}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: 'CANCELLED' })
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error('[Supabase] cancelOrder error:', res.status, errText);
      } else {
        window.dispatchEvent(new Event('orders_updated'));
      }
      return res.ok;
    } catch (err) {
      console.warn('[Supabase] cancelOrder network error:', err);
      return false;
    }
  },

  // Xóa hẳn một đơn hàng (Admin only)
  async deleteOrder(orderCode, orderId) {
    try {
      const matchQuery = orderCode
        ? `order_code=eq.${orderCode}`
        : `id=eq.${orderId}`;
      const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?${matchQuery}`, {
        method: 'DELETE',
        headers
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error('[Supabase] deleteOrder error:', res.status, errText);
      }
      return res.ok;
    } catch (err) {
      console.warn('[Supabase] deleteOrder network error:', err);
      return false;
    }
  },

  // ── QUẢN LÝ NGƯỜI DÙNG ───────────────────────────────────────────────────

  // Lấy tất cả users (Admin only)
  async getUsers() {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/users?select=*&order=created_at.desc`, { headers });
      if (res.ok) return await res.json();
      console.error('[Supabase] getUsers error:', res.status, await res.text());
      return [];
    } catch (err) {
      console.warn('[Supabase] getUsers network error:', err);
      return [];
    }
  },

  // Tạo hoặc cập nhật user khi đăng nhập (upsert theo zalo_id)
  async upsertUser(userData) {
    // userData: { zalo_id, name, avatar, role? }
    const payload = {
      zalo_id: String(userData.zalo_id || userData.id || ''),
      name: userData.name || userData.display_name || 'Người dùng',
      avatar: userData.avatar || userData.picture || '',
      role: userData.role || 'user',
      last_login: new Date().toISOString()
    };
    if (!payload.zalo_id) return null;

    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/users?zalo_id=eq.${payload.zalo_id}`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ name: payload.name, avatar: payload.avatar, last_login: payload.last_login })
        }
      );
      // Nếu PATCH không tìm thấy row → INSERT mới
      const patchData = await res.json();
      if (!Array.isArray(patchData) || patchData.length === 0) {
        const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });
        if (insertRes.ok) {
          const inserted = await insertRes.json();
          return Array.isArray(inserted) ? inserted[0] : inserted;
        }
      }
      return Array.isArray(patchData) ? patchData[0] : patchData;
    } catch (err) {
      console.warn('[Supabase] upsertUser error:', err);
      return null;
    }
  },

  // Cập nhật role của user (Admin only)
  async updateUserRole(zaloId, role) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/users?zalo_id=eq.${zaloId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ role })
      });
      if (!res.ok) {
        console.error('[Supabase] updateUserRole error:', res.status, await res.text());
        return false;
      }
      return true;
    } catch (err) {
      console.warn('[Supabase] updateUserRole network error:', err);
      return false;
    }
  },

  // Lấy role của 1 user theo zalo_id
  async getUserRole(zaloId) {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/users?zalo_id=eq.${zaloId}&select=role`,
        { headers }
      );
      if (res.ok) {
        const data = await res.json();
        return (Array.isArray(data) && data[0]) ? data[0].role : 'user';
      }
      return 'user';
    } catch (err) {
      return 'user';
    }
  },

  // Xóa user (Admin only)
  async deleteUser(zaloId) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/users?zalo_id=eq.${zaloId}`, {
        method: 'DELETE',
        headers
      });
      return res.ok;
    } catch (err) {
      console.warn('[Supabase] deleteUser network error:', err);
      return false;
    }
  }
};
