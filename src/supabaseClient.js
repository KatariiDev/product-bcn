// Supabase REST client không phụ thuộc thư viện ngoài (Zero Dependency)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://uljpcofqhdgmwgwgbuzy.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_QaLj1RpOMWz4Jqj2SXokiw_tFD8HpQG';

const headers = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

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

    // 1. Lưu vào localStorage ngay lập tức (user thấy đơn ngay)
    try {
      const localOrders = JSON.parse(localStorage.getItem('aobcn_orders_cache') || '[]');
      localOrders.unshift(localObj);
      localStorage.setItem('aobcn_orders_cache', JSON.stringify(localOrders));
      window.dispatchEvent(new Event('orders_updated'));
    } catch (e) {
      console.warn('[Supabase] localStorage cache error:', e);
    }

    // 2. Đẩy lên Supabase
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
        return result;
      }
    } catch (err) {
      console.error('[Supabase] createOrder network error:', err);
    }

    return localObj;
  },

  // Lấy TẤT CẢ đơn hàng từ Supabase (Admin + User đều dùng)
  async getOrders() {
    // Lấy cache local trước
    let localOrders = [];
    try {
      localOrders = JSON.parse(localStorage.getItem('aobcn_orders_cache') || '[]');
    } catch (e) {}

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?select=*&order=created_at.desc`, { headers });
      if (res.ok) {
        const remoteOrders = await res.json();
        if (Array.isArray(remoteOrders)) {
          // Merge: ưu tiên trạng thái CANCELLED từ local (tránh mất khi PATCH chưa kịp sync)
          const remoteMap = new Map(remoteOrders.map(o => [String(o.order_code), o]));

          // Các đơn chỉ tồn tại trong local (chưa lên Supabase)
          const localOnlyOrders = localOrders.filter(o =>
            !remoteMap.has(String(o.order_code))
          );

          // Merge: nếu local đã CANCELLED thì giữ CANCELLED dù Supabase có khác
          const merged = remoteOrders.map(o => {
            const localMatch = localOrders.find(l => String(l.order_code) === String(o.order_code));
            if (localMatch?.status === 'CANCELLED' && o.status !== 'CANCELLED') {
              return { ...o, status: 'CANCELLED' };
            }
            return o;
          });

          const finalList = [...merged, ...localOnlyOrders].sort(
            (a, b) => new Date(b.created_at) - new Date(a.created_at)
          );

          // Cập nhật cache
          try { localStorage.setItem('aobcn_orders_cache', JSON.stringify(finalList)); } catch (e) {}
          return finalList;
        }
      } else {
        const errText = await res.text();
        console.error('[Supabase] getOrders error:', res.status, errText);
      }
    } catch (err) {
      console.warn('[Supabase] getOrders network error:', err);
    }

    // Fallback: dùng localStorage cache
    return localOrders;
  },

  // Alias dùng cho User page (giống getOrders nhưng có semantic riêng)
  async getUserOrders(zaloId) {
    return this.getOrders();
  },

  // Hủy đơn hàng
  async cancelOrder(orderCode, orderId) {
    // Cập nhật cache local ngay
    try {
      let localOrders = JSON.parse(localStorage.getItem('aobcn_orders_cache') || '[]');
      localOrders = localOrders.map(o => {
        const matchCode = orderCode && (o.order_code === orderCode || String(o.order_code) === String(orderCode));
        const matchId = orderId && (o.id === orderId || String(o.id) === String(orderId));
        if (matchCode || matchId) return { ...o, status: 'CANCELLED' };
        return o;
      });
      localStorage.setItem('aobcn_orders_cache', JSON.stringify(localOrders));
      window.dispatchEvent(new Event('orders_updated'));
    } catch (e) {
      console.warn('[Supabase] cancelOrder local cache error:', e);
    }

    // Cập nhật trên Supabase - chỉ dùng order_code vì id Supabase khác với id local
    try {
      if (!orderCode) {
        console.warn('[Supabase] cancelOrder: không có order_code để match trên Supabase');
        return false;
      }
      const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?order_code=eq.${orderCode}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: 'CANCELLED' })
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error('[Supabase] cancelOrder error:', res.status, errText);
      }
      return res.ok;
    } catch (err) {
      console.warn('[Supabase] cancelOrder network error:', err);
      return false;
    }
  },

  // Xóa hẳn một đơn hàng (Admin only)
  async deleteOrder(orderCode, orderId) {
    // Xóa khỏi localStorage cache
    try {
      let localOrders = JSON.parse(localStorage.getItem('aobcn_orders_cache') || '[]');
      localOrders = localOrders.filter(o =>
        !(orderCode && String(o.order_code) === String(orderCode)) &&
        !(orderId && (o.id === orderId || String(o.id) === String(orderId)))
      );
      localStorage.setItem('aobcn_orders_cache', JSON.stringify(localOrders));
    } catch (e) {}

    // Xóa trên Supabase
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
