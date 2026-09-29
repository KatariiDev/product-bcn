import React, { useState, useEffect, useRef } from 'react';
import './Admin.css';
import { Plus, Trash2, Edit3, Image as ImageIcon, Save, ArrowLeft, RefreshCw, X, Upload, Star, Sun, Moon, ShoppingBag, CheckCircle, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import bcn from '../src/assets/bcn.png';
import { supabaseApi } from '../src/supabaseClient';
import { Toast, ConfirmModal } from '../src/components/Toast';

export const INITIAL_PRODUCTS = [
  {
    id: 'prod-1',
    name: 'Áo Polo Ban Công Nghệ 2026',
    tag: 'Limited Edition',
    category: 'polo',
    price: 350000,
    oldPrice: 420000,
    genders: ['Male', 'Female'],
    sizes: ['S', 'M', 'L', 'XL'],
    inStock: true,
    description: 'Áo polo đồng phục Ban Công Nghệ chất liệu cá sấu poly 4 chiều cao cấp, thấm hút mồ hôi, co giãn thoải mái khi hoạt động công nghệ.',
    images: [
      bcn,
      'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80'
    ],
    image: bcn,
    badge: 'Hot Item'
  },
  {
    id: 'prod-2',
    name: 'Áo Hoodie Dev Tech Night',
    tag: 'Winter Drop',
    category: 'hoodie',
    price: 490000,
    oldPrice: 550000,
    genders: ['Male', 'Female'],
    sizes: ['M', 'L', 'XL', '2XL'],
    inStock: true,
    description: 'Hoodie nỉ bông dày dặn, in hologram logo BCN phát quang độc bản dành riêng cho coder cày đêm.',
    images: [
      bcn,
      'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600&auto=format&fit=crop&q=80'
    ],
    image: bcn,
    badge: 'Mới'
  },
  {
    id: 'prod-3',
    name: 'T-Shirt BCN Minimalist Edition',
    tag: 'Casual Techwear',
    category: 'tshirt',
    price: 250000,
    oldPrice: 290000,
    genders: ['Male', 'Female'],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    inStock: true,
    description: 'Chất liệu 100% cotton compact 250gsm thoáng mát, form oversize hiện đại, in lụa cao cấp không bong tróc.',
    images: [
      bcn,
      'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80'
    ],
    image: bcn,
    badge: 'Best Seller'
  },
  {
    id: 'prod-4',
    name: 'Áo Khoác Gió Bomber BCN Cyber',
    tag: 'Special Techwear',
    category: 'jacket',
    price: 590000,
    oldPrice: 690000,
    genders: ['Male', 'Female'],
    sizes: ['S', 'M', 'L', 'XL'],
    inStock: false,
    description: 'Áo khoác dù 2 lớp chống gió nước nhẹ, chi tiết phản quang và túi chức năng tiện dụng đựng thiết bị công nghệ.',
    images: [
      bcn
    ],
    image: bcn,
    badge: 'Tạm hết'
  }
];

export const STORAGE_KEY_PRODUCTS = 'aobcn_products_data';

export const getStoredProducts = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY_PRODUCTS);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(item => ({
          ...item,
          images: Array.isArray(item.images) && item.images.length > 0 
            ? item.images 
            : [item.image || bcn],
          image: item.image || (item.images && item.images[0]) || bcn
        }));
      }
    }
  } catch (err) {
    console.error('Lỗi đọc sản phẩm từ localStorage:', err);
  }
  return INITIAL_PRODUCTS;
};

export const saveStoredProducts = (products) => {
  try {
    localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(products));
    window.dispatchEvent(new Event('products_updated'));
  } catch (err) {
    console.error('Lỗi lưu sản phẩm vào localStorage:', err);
  }
};

const MAX_IMAGES = 10;

function Admin() {
  const [products, setProducts] = useState(() => getStoredProducts());
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('products'); // 'products' | 'orders'
  const [isSyncing, setIsSyncing] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const fileInputRef = useRef(null);
  const coverFileInputRef = useRef(null);

  // Tải sản phẩm & đơn hàng từ Supabase
  const fetchRemoteData = async () => {
    setIsSyncing(true);
    try {
      // 1. Lấy danh sách sản phẩm
      const remoteProds = await supabaseApi.getProducts();
      if (remoteProds && Array.isArray(remoteProds) && remoteProds.length > 0) {
        const formatted = remoteProds.map(p => ({
          id: p.id,
          name: p.name,
          tag: p.tag,
          category: p.category,
          price: Number(p.price),
          oldPrice: p.old_price ? Number(p.old_price) : null,
          sizes: Array.isArray(p.sizes) ? p.sizes : ['S', 'M', 'L', 'XL'],
          genders: Array.isArray(p.genders) ? p.genders : ['Male', 'Female'],
          inStock: p.in_stock !== false,
          badge: p.badge || '',
          image: p.image || bcn,
          images: Array.isArray(p.images) && p.images.length > 0 ? p.images : [p.image || bcn],
          description: p.description || ''
        }));
        setProducts(formatted);
        saveStoredProducts(formatted);
      } else if (remoteProds && remoteProds.length === 0) {
        // Nếu DB Supabase trống, tự động đưa các sản phẩm mẫu ban đầu lên Supabase
        for (const item of INITIAL_PRODUCTS) {
          await supabaseApi.upsertProduct(item);
        }
      }

      // 2. Lấy danh sách đơn hàng
      const remoteOrders = await supabaseApi.getOrders();
      if (remoteOrders && Array.isArray(remoteOrders)) {
        setOrders(remoteOrders);
      }
    } catch (err) {
      console.warn("Lỗi sync Supabase:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Chỉ fetch đơn hàng (nhẹ hơn, dùng để polling nhanh hơn)
  const fetchOrdersOnly = async () => {
    try {
      const remoteOrders = await supabaseApi.getOrders();
      if (remoteOrders && Array.isArray(remoteOrders)) {
        setOrders(remoteOrders);
      }
    } catch (err) {
      console.warn('Lỗi fetch orders:', err);
    }
  };

  useEffect(() => {
    fetchRemoteData();
    // Products: sync mỗi 5s
    const prodInterval = setInterval(async () => {
      const remoteProds = await supabaseApi.getProducts();
      if (remoteProds && Array.isArray(remoteProds) && remoteProds.length > 0) {
        const formatted = remoteProds.map(p => ({
          id: p.id, name: p.name, tag: p.tag, category: p.category,
          price: Number(p.price), oldPrice: p.old_price ? Number(p.old_price) : null,
          sizes: Array.isArray(p.sizes) ? p.sizes : ['S', 'M', 'L', 'XL'],
          genders: Array.isArray(p.genders) ? p.genders : ['Male', 'Female'],
          inStock: p.in_stock !== false, badge: p.badge || '',
          image: p.image || bcn,
          images: Array.isArray(p.images) && p.images.length > 0 ? p.images : [p.image || bcn],
          description: p.description || ''
        }));
        setProducts(formatted);
        saveStoredProducts(formatted);
      }
    }, 5000);
    // Orders: sync mỗi 3s để đầy đư real-time hơn
    const ordersInterval = setInterval(fetchOrdersOnly, 3000);
    return () => {
      clearInterval(prodInterval);
      clearInterval(ordersInterval);
    };
  }, []);

  const [formData, setFormData] = useState({
    name: '',
    tag: 'Limited Edition',
    category: 'tshirt',
    price: '',
    oldPrice: '',
    sizes: 'S, M, L, XL',
    genders: 'Male, Female',
    inStock: true,
    badge: '',
    primaryImage: '',
    images: [],
    description: ''
  });

  useEffect(() => {
    saveStoredProducts(products);
  }, [products]);

  const [toast, setToast] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const showToast = (message, type = 'info', title = '') => {
    setToast({ message, type, title });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const handleResetDefaults = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Khôi Phục Dữ Liệu Gốc',
      message: 'Bạn có chắc chắn muốn khôi phục danh sách sản phẩm mẫu ban đầu lên Supabase không?',
      confirmText: 'Khôi phục ngay',
      cancelText: 'Hủy bỏ',
      danger: true,
      onConfirm: async () => {
        setProducts(INITIAL_PRODUCTS);
        saveStoredProducts(INITIAL_PRODUCTS);
        for (const item of INITIAL_PRODUCTS) {
          await supabaseApi.upsertProduct(item);
        }
        showToast('Đã khôi phục sản phẩm mẫu thành công!', 'success', 'Thành công');
      }
    });
  };

  const handleEdit = (p) => {
    setEditingProduct(p.id);
    const imgList = Array.isArray(p.images) && p.images.length > 0 
      ? p.images 
      : (p.image ? [p.image] : []);
    
    const cover = p.image || (imgList.length > 0 ? imgList[0] : '');

    setFormData({
      name: p.name,
      tag: p.tag || '',
      category: p.category || 'tshirt',
      price: p.price,
      oldPrice: p.oldPrice || '',
      sizes: Array.isArray(p.sizes) ? p.sizes.join(', ') : p.sizes,
      genders: Array.isArray(p.genders) ? p.genders.join(', ') : p.genders,
      inStock: p.inStock ?? true,
      badge: p.badge || '',
      primaryImage: cover,
      images: imgList,
      description: p.description || ''
    });
  };

  const handleDelete = (id) => {
    const itemToDelete = products.find(p => p.id === id);
    const itemName = itemToDelete?.name || 'sản phẩm này';
    setConfirmModal({
      isOpen: true,
      title: 'Xóa Sản Phẩm',
      message: `Bạn có chắc chắn muốn xóa "${itemName}" khỏi hệ thống không?`,
      confirmText: 'Xóa sản phẩm',
      cancelText: 'Giữ lại',
      danger: true,
      onConfirm: async () => {
        const updated = products.filter(p => p.id !== id);
        setProducts(updated);
        saveStoredProducts(updated);
        await supabaseApi.deleteProduct(id);
        if (editingProduct === id) {
          setEditingProduct(null);
        }
        showToast(`Đã xóa "${itemName}" thành công!`, 'success', 'Đã xóa');
      }
    });
  };

  // Chọn ảnh từ máy tính cho ảnh chính
  const handleCoverFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Vui lòng chọn file hình ảnh hợp lệ (PNG, JPG, WEBP)!', 'error', 'File không hợp lệ');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Url = event.target?.result;
      if (base64Url) {
        setFormData(prev => {
          const newImages = prev.images.includes(base64Url) ? prev.images : [base64Url, ...prev.images].slice(0, MAX_IMAGES);
          return {
            ...prev,
            primaryImage: base64Url,
            images: newImages
          };
        });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Upload nhiều ảnh từ máy tính
  const handleGalleryFilesUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = MAX_IMAGES - formData.images.length;
    if (remainingSlots <= 0) {
      showToast(`Đã đạt giới hạn tối đa ${MAX_IMAGES} hình ảnh cho mỗi sản phẩm!`, 'warning', 'Giới hạn ảnh');
      return;
    }

    const selectedFiles = files.slice(0, remainingSlots);

    selectedFiles.forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Url = event.target?.result;
        if (base64Url) {
          setFormData(prev => {
            if (prev.images.length >= MAX_IMAGES) return prev;
            const updated = [...prev.images, base64Url];
            return {
              ...prev,
              images: updated,
              primaryImage: prev.primaryImage || base64Url
            };
          });
        }
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  // Thêm 1 ô nhập URL ảnh mới
  const handleAddImageUrl = () => {
    if (formData.images.length >= MAX_IMAGES) {
      showToast(`Chỉ được phép thêm tối đa ${MAX_IMAGES} hình ảnh!`, 'warning', 'Giới hạn ảnh');
      return;
    }
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, '']
    }));
  };

  const handleImageUrlChange = (index, value) => {
    const updated = [...formData.images];
    updated[index] = value;
    setFormData(prev => ({
      ...prev,
      images: updated,
      primaryImage: prev.primaryImage || value
    }));
  };

  const handleRemoveImage = (index) => {
    const targetImg = formData.images[index];
    const updated = formData.images.filter((_, i) => i !== index);
    
    let newPrimary = formData.primaryImage;
    if (newPrimary === targetImg) {
      newPrimary = updated.length > 0 ? updated[0] : '';
    }

    setFormData(prev => ({
      ...prev,
      images: updated,
      primaryImage: newPrimary
    }));
  };

  const handleSetPrimaryImage = (imgUrl) => {
    if (!imgUrl) return;
    setFormData(prev => ({
      ...prev,
      primaryImage: imgUrl
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.price) {
      showToast('Vui lòng nhập tên và giá sản phẩm!', 'warning', 'Thiếu thông tin');
      return;
    }

    const sizesArr = formData.sizes.split(',').map(s => s.trim()).filter(Boolean);
    const gendersArr = formData.genders.split(',').map(g => g.trim()).filter(Boolean);
    
    // Thu thập và làm sạch danh sách ảnh
    const cleanImages = formData.images.map(img => img.trim()).filter(Boolean);
    const primary = formData.primaryImage.trim() || (cleanImages.length > 0 ? cleanImages[0] : bcn);

    // Đảm bảo primary image luôn nằm trong mảng images và ở vị trí đầu
    let finalImages = cleanImages.filter(img => img !== primary);
    finalImages = [primary, ...finalImages].slice(0, MAX_IMAGES);

    const productPayload = {
      id: editingProduct || `prod-${Date.now()}`,
      name: formData.name,
      tag: formData.tag || 'Special Edition',
      category: formData.category,
      price: Number(formData.price),
      oldPrice: formData.oldPrice ? Number(formData.oldPrice) : null,
      sizes: sizesArr.length > 0 ? sizesArr : ['S', 'M', 'L', 'XL'],
      genders: gendersArr.length > 0 ? gendersArr : ['Male', 'Female'],
      inStock: formData.inStock,
      badge: formData.badge,
      image: primary,
      images: finalImages,
      description: formData.description
    };

    let updatedList;
    if (editingProduct) {
      updatedList = products.map(p => p.id === editingProduct ? productPayload : p);
      setProducts(updatedList);
      setEditingProduct(null);
    } else {
      updatedList = [productPayload, ...products];
      setProducts(updatedList);
    }

    saveStoredProducts(updatedList);
    // Đồng bộ lên cơ sở dữ liệu Supabase online (mọi máy cập nhật ngay)
    supabaseApi.upsertProduct(productPayload);
    showToast(editingProduct ? 'Đã lưu thay đổi sản phẩm thành công!' : 'Đã thêm sản phẩm mới thành công!', 'success', 'Thành công');

    // Reset form
    setFormData({
      name: '',
      tag: 'Limited Edition',
      category: 'tshirt',
      price: '',
      oldPrice: '',
      sizes: 'S, M, L, XL',
      genders: 'Male, Female',
      inStock: true,
      badge: '',
      primaryImage: '',
      images: [],
      description: ''
    });
  };

  const [themeMode, setThemeMode] = useState(() => localStorage.getItem('app_theme_mode') || 'auto');

  const toggleThemeMode = () => {
    const nextMode = themeMode === 'light' ? 'dark' : themeMode === 'dark' ? 'auto' : 'light';
    setThemeMode(nextMode);
    localStorage.setItem('app_theme_mode', nextMode);
    window.dispatchEvent(new Event('theme_mode_changed'));
  };

  return (
    <div className={`admin-page ${themeMode === 'light' ? 'admin-light-mode' : ''}`}>
      <header className="admin-header">
        <div className="admin-brand">
          <img src={bcn} alt="BCN" className="admin-logo" />
          <div>
            <h1>Quản Trị Sản Phẩm BCN</h1>
            <p>Admin Dashboard - Cập nhật sản phẩm cho User Page</p>
          </div>
        </div>
        <div className="admin-actions">
          <button 
            className="btn-secondary" 
            onClick={toggleThemeMode}
            title={`Chế độ theme: ${themeMode}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            {themeMode === 'light' ? <Sun size={16} /> : <Moon size={16} />}
            <span>Theme: {themeMode === 'auto' ? 'Auto (Giờ)' : themeMode === 'light' ? 'Sáng' : 'Tối'}</span>
          </button>
          <button className="btn-secondary" onClick={handleResetDefaults}>
            <RefreshCw size={16} /> Reset mẫu
          </button>
          <Link to="/user" className="btn-primary">
            <ArrowLeft size={16} /> Xem trang User
          </Link>
        </div>
      </header>

      <div className="admin-container">
        {/* Form thêm / sửa sản phẩm */}
        <div className="admin-card form-card">
          <h2>{editingProduct ? 'Chỉnh Sửa Sản Phẩm' : 'Thêm Sản Phẩm Mới'}</h2>
          <form onSubmit={handleSubmit} className="product-form">
            <div className="form-group">
              <label>Tên sản phẩm *</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="VD: Áo Thun Ban Công Nghệ 2026"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Phân loại danh mục</label>
                <select
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="all">Tất cả danh mục</option>
                  <option value="polo">Áo Polo</option>
                  <option value="tshirt">Áo Thun (T-Shirt)</option>
                  <option value="hoodie">Áo Hoodie</option>
                  <option value="jacket">Áo Khoác</option>
                </select>
              </div>

              <div className="form-group">
                <label>Tag / Nhãn phụ</label>
                <input
                  type="text"
                  value={formData.tag}
                  onChange={e => setFormData({ ...formData, tag: e.target.value })}
                  placeholder="VD: Limited Edition, Techwear"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Giá bán (VNĐ) *</label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={e => setFormData({ ...formData, price: e.target.value })}
                  placeholder="350000"
                  required
                />
              </div>

              <div className="form-group">
                <label>Giá gốc / Khuyến mãi (VNĐ)</label>
                <input
                  type="number"
                  value={formData.oldPrice}
                  onChange={e => setFormData({ ...formData, oldPrice: e.target.value })}
                  placeholder="420000"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Kích thước</label>
                <input
                  type="text"
                  value={formData.sizes}
                  onChange={e => setFormData({ ...formData, sizes: e.target.value })}
                  placeholder="S, M, L, XL"
                />
              </div>

              <div className="form-group">
                <label>Giới tính</label>
                <input
                  type="text"
                  value={formData.genders}
                  onChange={e => setFormData({ ...formData, genders: e.target.value })}
                  placeholder="Male, Female"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Badge nổi bật</label>
                <input
                  type="text"
                  value={formData.badge}
                  onChange={e => setFormData({ ...formData, badge: e.target.value })}
                  placeholder="VD: Hot, Best Seller, New"
                />
              </div>

              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.inStock}
                    onChange={e => setFormData({ ...formData, inStock: e.target.checked })}
                  />
                  <span>Còn hàng (In Stock)</span>
                </label>
              </div>
            </div>

            {/* Ô ĐẶT ẢNH HIỂN THỊ CHÍNH (PRIMARY COVER) */}
            <div className="primary-cover-box">
              <div className="cover-label-row">
                <label>
                  <Star size={15} className="star-icon" /> Ảnh Hiển Thị Chính Của Sản Phẩm
                </label>
                <span className="primary-badge-tag">Ảnh đại diện</span>
              </div>

              <div className="cover-content-layout">
                <div className="cover-preview-img-wrap">
                  <img
                    src={formData.primaryImage || (formData.images.length > 0 && formData.images[0]) || bcn}
                    alt="Ảnh chính"
                  />
                </div>
                <div className="cover-input-fields">
                  <input
                    type="text"
                    value={formData.primaryImage}
                    onChange={(e) => setFormData({ ...formData, primaryImage: e.target.value })}
                    placeholder="URL ảnh bìa chính hoặc tải từ máy tính..."
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="file"
                      ref={coverFileInputRef}
                      style={{ display: 'none' }}
                      accept="image/*"
                      onChange={handleCoverFileUpload}
                    />
                    <button
                      type="button"
                      className="btn-upload-file"
                      onClick={() => coverFileInputRef.current?.click()}
                    >
                      <Upload size={14} /> Tải ảnh chính từ máy tính
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* KHU VỰC QUẢN LÝ NHIỀU ẢNH (TỐI ĐA 10 ẢNH) */}
            <div className="images-section">
              <div className="images-header">
                <label>
                  Bộ sưu tập chi tiết (Tối đa {MAX_IMAGES} ảnh)
                </label>
                <span className={`image-counter ${formData.images.length >= MAX_IMAGES ? 'limit-reached' : ''}`}>
                  {formData.images.filter(Boolean).length} / {MAX_IMAGES} ảnh
                </span>
              </div>

              <div className="gallery-grid-manager">
                {formData.images.map((imgUrl, idx) => (
                  <div key={idx} className="image-item-card">
                    <div className="item-thumb-preview">
                      <img src={imgUrl || bcn} alt={`Góc chụp ${idx + 1}`} />
                    </div>
                    <div className="item-input-wrap">
                      <input
                        type="text"
                        value={imgUrl}
                        onChange={(e) => handleImageUrlChange(idx, e.target.value)}
                        placeholder={`URL ảnh góc chụp ${idx + 1}...`}
                      />
                    </div>
                    {imgUrl && formData.primaryImage !== imgUrl && (
                      <button
                        type="button"
                        className="btn-set-cover"
                        onClick={() => handleSetPrimaryImage(imgUrl)}
                        title="Đặt làm ảnh hiển thị chính"
                      >
                        Đặt làm bìa
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn-remove-img"
                      onClick={() => handleRemoveImage(idx)}
                      title="Xóa ảnh này"
                    >
                      <X size={15} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Action bar: Tải ảnh từ máy tính hoặc thêm ô URL */}
              <div className="images-action-bar">
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept="image/*"
                  multiple
                  onChange={handleGalleryFilesUpload}
                />
                <button
                  type="button"
                  className="btn-upload-file"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={formData.images.length >= MAX_IMAGES}
                >
                  <Upload size={14} /> Chọn ảnh từ máy tính cá nhân
                </button>

                <button
                  type="button"
                  className="btn-add-img"
                  onClick={handleAddImageUrl}
                  disabled={formData.images.length >= MAX_IMAGES}
                >
                  <Plus size={14} /> Thêm URL ảnh
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Mô tả chi tiết</label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Mô tả chất liệu, thiết kế, form dáng áo..."
              />
            </div>

            <div className="form-buttons">
              <button type="submit" className="btn-submit">
                {editingProduct ? <Save size={16} /> : <Plus size={16} />}
                {editingProduct ? 'Lưu thay đổi' : 'Thêm sản phẩm'}
              </button>
              {editingProduct && (
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => {
                    setEditingProduct(null);
                    setFormData({
                      name: '',
                      tag: 'Limited Edition',
                      category: 'tshirt',
                      price: '',
                      oldPrice: '',
                      sizes: 'S, M, L, XL',
                      genders: 'Male, Female',
                      inStock: true,
                      badge: '',
                      primaryImage: '',
                      images: [],
                      description: ''
                    });
                  }}
                >
                  Hủy chỉnh sửa
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Danh sách sản phẩm & Quản lý đơn hàng */}
        <div className="admin-card list-card">
          <div className="list-header">
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button 
                type="button"
                className={`btn-secondary ${activeTab === 'products' ? 'tab-active' : ''}`}
                onClick={() => setActiveTab('products')}
                style={{
                  background: activeTab === 'products' ? '#0284c7' : undefined,
                  color: activeTab === 'products' ? '#fff' : undefined,
                  borderColor: activeTab === 'products' ? '#0284c7' : undefined
                }}
              >
                Sản Phẩm ({products.length})
              </button>
              <button 
                type="button"
                className={`btn-secondary ${activeTab === 'orders' ? 'tab-active' : ''}`}
                onClick={() => { setActiveTab('orders'); fetchOrdersOnly(); }}
                style={{
                  background: activeTab === 'orders' ? '#0284c7' : undefined,
                  color: activeTab === 'orders' ? '#fff' : undefined,
                  borderColor: activeTab === 'orders' ? '#0284c7' : undefined,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <ShoppingBag size={15} />
                Đơn Hàng ({orders.length})
              </button>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button 
                type="button"
                className="btn-secondary"
                onClick={fetchRemoteData}
                title="Đồng bộ ngay với Supabase"
                style={{ padding: '6px 12px', fontSize: '12px' }}
              >
                <RefreshCw size={13} className={isSyncing ? 'spinning' : ''} /> Đồng bộ
              </button>
              <span className="sync-badge">🟢 Supabase Realtime</span>
            </div>
          </div>

          {activeTab === 'products' ? (
            <div className="product-table-wrapper">
              <table className="product-table">
                <thead>
                  <tr>
                    <th>Hình ảnh</th>
                    <th>Thông tin sản phẩm</th>
                    <th>Danh mục</th>
                    <th>Giá</th>
                    <th>Trạng thái</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '30px' }}>
                        Chưa có sản phẩm nào. Hãy thêm sản phẩm mới!
                      </td>
                    </tr>
                  ) : (
                    products.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div className="table-img-wrap">
                            <img src={item.image || (item.images && item.images[0]) || bcn} alt={item.name} />
                            {item.images && item.images.length > 1 && (
                              <span className="img-count-tag">+{item.images.length}</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="table-name">{item.name}</div>
                          <div className="table-tag">{item.tag}</div>
                        </td>
                        <td>
                          <span className="cat-badge">{item.category}</span>
                        </td>
                        <td>
                          <div className="table-price">{item.price?.toLocaleString('vi-VN')} đ</div>
                          {item.oldPrice && (
                            <div className="table-oldprice">{item.oldPrice?.toLocaleString('vi-VN')} đ</div>
                          )}
                        </td>
                        <td>
                          <span className={`status-pill ${item.inStock ? 'in-stock' : 'out-stock'}`}>
                            {item.inStock ? 'Còn hàng' : 'Hết hàng'}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button
                              className="btn-icon edit"
                              onClick={() => handleEdit(item)}
                              title="Chỉnh sửa"
                            >
                              <Edit3 size={15} />
                            </button>
                            <button
                              className="btn-icon delete"
                              onClick={() => handleDelete(item.id)}
                              title="Xóa"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            /* TAB ĐƠN HÀNG */
            <div className="product-table-wrapper">
              <table className="product-table">
                <thead>
                  <tr>
                    <th>Mã Đơn</th>
                    <th>Khách Hàng</th>
                    <th>Sản Phẩm</th>
                    <th>Phân Loại</th>
                    <th>Số Lượng</th>
                    <th>Tổng Tiền</th>
                    <th>Thời Gian</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '35px', color: '#94a3b8' }}>
                        Chưa có đơn hàng nào từ người dùng. Khi User bấm Đặt Hàng, đơn sẽ lập tức xuất hiện tại đây!
                      </td>
                    </tr>
                  ) : (
                    orders.map((ord) => (
                      <tr key={ord.id || ord.order_code}>
                        <td>
                          <span style={{ fontWeight: 700, color: '#0284c7' }}>
                            #{ord.order_code || ord.id}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{ord.name}</div>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>ID: {ord.zalo_id || 'guest'}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{ord.product_name}</div>
                        </td>
                        <td>
                          <span className="cat-badge" style={{ marginRight: '4px' }}>{ord.gender}</span>
                          <span className="cat-badge" style={{ fontWeight: 700 }}>Size {ord.size}</span>
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 700 }}>
                          {ord.quantity}
                        </td>
                        <td>
                          <div className="table-price">
                            {Number(ord.total_price || (ord.price * ord.quantity) || 0).toLocaleString('vi-VN')} đ
                          </div>
                        </td>
                        <td style={{ fontSize: '12px', color: '#94a3b8' }}>
                          {ord.created_at ? new Date(ord.created_at).toLocaleString('vi-VN') : 'Vừa xong'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* THÔNG BÁO TOAST & MODAL XÁC NHẬN */}
      <div className="toast-container">
        <Toast toast={toast} onClose={() => setToast(null)} />
      </div>

      <ConfirmModal 
        modal={confirmModal} 
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })} 
        onConfirm={confirmModal.onConfirm} 
      />
    </div>
  );
}

export default Admin;
