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
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?select=*&order=created_at.desc`, { headers });
      if (res.ok) {
        const data = await res.json();
        // Cập nhật cache local
        try { localStorage.setItem('aobcn_orders_cache', JSON.stringify(data)); } catch (e) {}
        return data;
      }
      const errText = await res.text();
      console.error('[Supabase] getOrders error:', res.status, errText);
    } catch (err) {
      console.warn('[Supabase] getOrders network error:', err);
    }
    // Fallback: dùng localStorage cache
    try {
      return JSON.parse(localStorage.getItem('aobcn_orders_cache') || '[]');
    } catch (e) {
      return [];
    }
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
  }
};
