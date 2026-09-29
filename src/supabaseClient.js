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
  // Lấy danh sách sản phẩm
  async getProducts() {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/products?select=*&order=created_at.desc`, {
        headers
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('Lỗi lấy sản phẩm từ Supabase:', err);
      return null;
    }
  },

  // Lưu hoặc cập nhật một sản phẩm
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
        headers: {
          ...headers,
          'Prefer': 'resolution=merge-duplicates,return=representation'
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('Lỗi lưu sản phẩm lên Supabase:', err);
      return null;
    }
  },

  // Xóa sản phẩm
  async deleteProduct(productId) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${productId}`, {
        method: 'DELETE',
        headers
      });
      return res.ok;
    } catch (err) {
      console.warn('Lỗi xóa sản phẩm trên Supabase:', err);
      return false;
    }
  },

  // Tạo đơn hàng mới (lưu Supabase + localStorage fallback)
  async createOrder(order) {
    const newOrderObj = {
      id: `ord-${Date.now()}`,
      order_code: order.orderCode,
      zalo_id: order.zaloId || 'guest',
      name: order.name || 'Khách hàng',
      product_name: order.productName,
      gender: order.gender,
      size: order.size,
      quantity: order.quantity || 1,
      price: Number(order.price),
      total_price: Number(order.totalPrice),
      status: 'PENDING',
      created_at: new Date().toISOString()
    };

    // 1. Luôn lưu vào LocalStorage để đảm bảo máy hiện tại thấy đơn 100%
    try {
      const localOrders = JSON.parse(localStorage.getItem('aobcn_orders_cache') || '[]');
      localOrders.unshift(newOrderObj);
      localStorage.setItem('aobcn_orders_cache', JSON.stringify(localOrders));
      window.dispatchEvent(new Event('orders_updated'));
    } catch (e) {
      console.warn('Lỗi lưu order cache:', e);
    }

    // 2. Đồng bộ lên Supabase Database
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
        method: 'POST',
        headers,
        body: JSON.stringify(newOrderObj)
      });
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Lỗi phản hồi từ Supabase /orders:', res.status, errorText);
      } else {
        return await res.json();
      }
    } catch (err) {
      console.error('Lỗi kết nối Supabase tạo đơn:', err);
    }
    return newOrderObj;
  },

  // Lấy danh sách đơn hàng (kết hợp Supabase + LocalStorage)
  async getOrders() {
    let remoteOrders = [];
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?select=*&order=created_at.desc`, {
        headers
      });
      if (res.ok) {
        remoteOrders = await res.json();
      }
    } catch (err) {
      console.warn('Lỗi fetch đơn hàng từ Supabase:', err);
    }

    // Lấy cache local
    let localOrders = [];
    try {
      localOrders = JSON.parse(localStorage.getItem('aobcn_orders_cache') || '[]');
    } catch (e) {
      localOrders = [];
    }

    // Gộp và loại trùng lặp theo order_code
    if (Array.isArray(remoteOrders) && remoteOrders.length > 0) {
      // Lưu lại bản mới nhất vào cache
      try {
        localStorage.setItem('aobcn_orders_cache', JSON.stringify(remoteOrders));
      } catch (e) {}
      return remoteOrders;
    }

    return localOrders;
  },

  // Hủy đơn hàng (Cập nhật status sang CANCELLED hoặc Xóa khỏi DB)
  async cancelOrder(orderCode, orderId) {
    // 1. Cập nhật cache local ngay lập tức
    try {
      let localOrders = JSON.parse(localStorage.getItem('aobcn_orders_cache') || '[]');
      localOrders = localOrders.map(o => {
        if ((orderCode && o.order_code === orderCode) || (orderId && (o.id === orderId || String(o.id) === String(orderId)))) {
          return { ...o, status: 'CANCELLED' };
        }
        return o;
      });
      localStorage.setItem('aobcn_orders_cache', JSON.stringify(localOrders));
      window.dispatchEvent(new Event('orders_updated'));
    } catch (e) {
      console.warn('Lỗi cập nhật cancel local:', e);
    }

    // 2. Cập nhật trạng thái trên Supabase
    try {
      const matchQuery = orderCode ? `order_code=eq.${orderCode}` : `id=eq.${orderId}`;
      const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?${matchQuery}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: 'CANCELLED' })
      });
      return res.ok;
    } catch (err) {
      console.warn('Lỗi cập nhật cancel trên Supabase:', err);
      return false;
    }
  }
};
