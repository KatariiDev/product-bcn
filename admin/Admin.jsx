import React, { useState, useEffect, useRef } from 'react';
import './Admin.css';
import { Plus, Trash2, Edit3, Image as ImageIcon, Save, ArrowLeft, RefreshCw, X, Upload, Star, Sun, Moon, ShoppingBag, CheckCircle, Clock, Users, Shield, UserCheck, Search, KeyRound, Eye, EyeOff, UserPlus, Lock } from 'lucide-react';
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

export const resolveProductCover = (item) => {
  if (item?.image && typeof item.image === 'string' && item.image.trim() !== '') {
    return item.image;
  }
  if (Array.isArray(item?.images) && item.images.length > 0) {
    const valid = item.images.find(img => img && typeof img === 'string' && img.trim() !== '');
    if (valid) return valid;
  }
  return bcn;
};

export const getStoredProducts = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY_PRODUCTS);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(item => {
          const cover = resolveProductCover(item);
          const validImgs = Array.isArray(item.images)
            ? item.images.filter(img => img && typeof img === 'string' && img.trim() !== '')
            : [];
          return {
            ...item,
            image: cover,
            images: validImgs.length > 0 ? validImgs : [cover]
          };
        });
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
  const [users, setUsers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('products'); // 'products' | 'orders' | 'users' | 'accounts'

  // State form tạo tài khoản nội bộ
  const [accountForm, setAccountForm] = useState({ username: '', password: '', displayName: '', role: 'user' });
  const [accountFormLoading, setAccountFormLoading] = useState(false);
  const [showAccountPassword, setShowAccountPassword] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(null);
  const fileInputRef = useRef(null);
  const coverFileInputRef = useRef(null);

  // Danh mục tùy chỉnh do admin tự thêm (lưu localStorage)
  const DEFAULT_CATEGORIES = [
    { value: 'polo', label: 'Áo Polo' },
    { value: 'tshirt', label: 'Áo Thun (T-Shirt)' },
    { value: 'hoodie', label: 'Áo Hoodie' },
    { value: 'jacket', label: 'Áo Khoác' },
  ];
  const [customCategories, setCustomCategories] = useState(() => {
    try {
      const saved = localStorage.getItem('admin_custom_categories');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [newCategoryInput, setNewCategoryInput] = useState('');

  const allCategories = [
    ...DEFAULT_CATEGORIES,
    ...customCategories.filter(c => !DEFAULT_CATEGORIES.some(d => d.value === c.value))
  ];

  const handleAddCategory = () => {
    const trimmed = newCategoryInput.trim();
    if (!trimmed) return;
    // Dùng thẳng text gõ vào làm value — không convert lowercase hay gạch dưới
    if (!allCategories.some(c => c.value === trimmed)) {
      const updated = [...customCategories, { value: trimmed, label: trimmed }];
      setCustomCategories(updated);
      localStorage.setItem('admin_custom_categories', JSON.stringify(updated));
    }
    setFormData(prev => ({ ...prev, category: trimmed }));
    setNewCategoryInput('');
  };

  // Kiểm tra quyền Admin khi truy cập trang
  useEffect(() => {
    const verifyAdmin = async () => {
      try {
        const saved = localStorage.getItem('zalo_user');
        if (!saved) {
          window.location.href = '/';
          return;
        }
        const u = JSON.parse(saved);
        const zaloId = u.id || u.zalo_id;
        const role = await supabaseApi.getUserRole(zaloId);
        if (role !== 'admin') {
          sessionStorage.setItem('auth_error', 'Tài khoản của bạn không có quyền truy cập trang Quản Trị!');
          window.location.href = '/user';
          return;
        }
        setIsAuthorized(true);
      } catch (err) {
        console.error('Lỗi xác thực quyền admin:', err);
        sessionStorage.setItem('auth_error', 'Không thể xác thực quyền truy cập. Vui lòng thử lại!');
        window.location.href = '/user';
      }
    };
    verifyAdmin();
  }, []);

  // Polling role mỗi 12s — nếu bị hạ quyền thì tự động redirect về /user
  useEffect(() => {
    const pollRole = async () => {
      try {
        const saved = localStorage.getItem('zalo_user');
        if (!saved) return;
        const u = JSON.parse(saved);
        const zaloId = u.id || u.zalo_id;
        if (!zaloId) return;
        const role = await supabaseApi.getUserRole(zaloId);
        if (role !== 'admin') {
          sessionStorage.setItem('auth_error', 'Quyền Admin của bạn vừa bị thay đổi. Đã chuyển về trang User!');
          window.location.href = '/user';
        }
      } catch (_) { /* bỏ qua lỗi mạng */ }
    };
    // Chỉ bắt đầu poll sau khi đã xác thực thành công
    const interval = setInterval(pollRole, 5000);
    return () => clearInterval(interval);
  }, []);

  // Tải sản phẩm & đơn hàng từ Supabase
  const fetchRemoteData = async () => {
    setIsSyncing(true);
    try {
      // 1. Lấy danh sách sản phẩm
      const remoteProds = await supabaseApi.getProducts();
      if (remoteProds && Array.isArray(remoteProds) && remoteProds.length > 0) {
        const formatted = remoteProds.map(p => {
          const cover = resolveProductCover(p);
          const validImgs = Array.isArray(p.images)
            ? p.images.filter(img => img && typeof img === 'string' && img.trim() !== '')
            : [];
          return {
            id: p.id,
            name: p.name,
            tag: p.tag,
            category: p.category,
            price: Math.round(Number(p.price)),
            oldPrice: p.old_price ? Math.round(Number(p.old_price)) : null,
            sizes: Array.isArray(p.sizes) ? p.sizes : ['S', 'M', 'L', 'XL'],
            genders: Array.isArray(p.genders) ? p.genders : ['Male', 'Female'],
            inStock: p.in_stock !== false,
            badge: p.badge || '',
            image: cover,
            images: validImgs.length > 0 ? validImgs : [cover],
            description: p.description || ''
          };
        });
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

      // 3. Lấy danh sách tài khoản
      await fetchUsers();
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

  const handleDeleteOrder = (ord) => {
    const code = ord.order_code || ord.id;
    setConfirmModal({
      isOpen: true,
      title: 'Xóa Đơn Hàng',
      message: `Xóa vĩnh viễn đơn hàng #${code} của khách "${ord.name}"? Thao tác này không thể hoàn tác.`,
      confirmText: 'Xóa đơn hàng',
      cancelText: 'Giữ lại',
      danger: true,
      onConfirm: async () => {
        await supabaseApi.deleteOrder(ord.order_code, ord.id);
        setOrders(prev => prev.filter(o =>
          !(o.order_code === ord.order_code && o.id === ord.id) &&
          !(o.order_code === ord.order_code && !ord.id) &&
          !(o.id === ord.id && !ord.order_code)
        ));
        showToast(`Đã xóa đơn hàng #${code} thành công!`, 'success', 'Xóa thành công');
      }
    });
  };

  const fetchUsers = async () => {
    const data = await supabaseApi.getUsers();
    if (Array.isArray(data)) setUsers(data);
  };

  const fetchAccounts = async () => {
    const data = await supabaseApi.getAccounts();
    if (Array.isArray(data)) setAccounts(data);
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    const { username, password, displayName, role } = accountForm;
    if (!username.trim() || !password) {
      showToast('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu!', 'error', 'Thiếu thông tin');
      return;
    }
    if (password.length < 6) {
      showToast('Mật khẩu phải có ít nhất 6 ký tự!', 'error', 'Mật khẩu yếu');
      return;
    }
    setAccountFormLoading(true);
    try {
      const result = await supabaseApi.createAccount(username, password, displayName, role);
      if (result.success) {
        showToast(`Đã tạo tài khoản "${username.trim().toLowerCase()}" thành công!`, 'success', 'Tạo thành công');
        setAccountForm({ username: '', password: '', displayName: '', role: 'user' });
        await fetchAccounts();
      } else {
        showToast(result.error || 'Tạo tài khoản thất bại!', 'error', 'Lỗi');
      }
    } finally {
      setAccountFormLoading(false);
    }
  };

  const handleDeleteAccount = (acc) => {
    setConfirmModal({
      isOpen: true,
      title: 'Xóa Tài Khoản Nội Bộ',
      message: `Xóa tài khoản "${acc.username}" (${acc.display_name})? Thao tác này không thể hoàn tác.`,
      confirmText: 'Xóa tài khoản',
      cancelText: 'Giữ lại',
      danger: true,
      onConfirm: async () => {
        await supabaseApi.deleteAccount(acc.id);
        setAccounts(prev => prev.filter(a => a.id !== acc.id));
        showToast(`Đã xóa tài khoản "${acc.username}"!`, 'success', 'Đã xóa');
      }
    });
  };

  const handleUpdateRole = async (u, newRole) => {
    const ok = await supabaseApi.updateUserRole(u.zalo_id, newRole);
    if (ok) {
      setUsers(prev => prev.map(x => x.zalo_id === u.zalo_id ? { ...x, role: newRole } : x));
      showToast(`Đã cập nhật quyền ${newRole === 'admin' ? 'Admin' : 'User'} cho ${u.name}!`, 'success', 'Cập nhật quyền');
    } else {
      showToast('Cập nhật quyền thất bại. Vui lòng thử lại!', 'error', 'Lỗi');
    }
  };

  const handleDeleteUser = (u) => {
    setConfirmModal({
      isOpen: true,
      title: 'Xóa Tài Khoản',
      message: `Xóa tài khoản "${u.name}" (Zalo ID: ${u.zalo_id}) khỏi hệ thống? Thao tác này không thể hoàn tác.`,
      confirmText: 'Xóa tài khoản',
      cancelText: 'Giữ lại',
      danger: true,
      onConfirm: async () => {
        await supabaseApi.deleteUser(u.zalo_id);
        setUsers(prev => prev.filter(x => x.zalo_id !== u.zalo_id));
        showToast(`Đã xóa tài khoản ${u.name}!`, 'success', 'Đã xóa');
      }
    });
  };

  useEffect(() => {
    fetchRemoteData();
    // Products: sync mỗi 5s
    const prodInterval = setInterval(async () => {
      const remoteProds = await supabaseApi.getProducts();
      if (remoteProds && Array.isArray(remoteProds) && remoteProds.length > 0) {
        const formatted = remoteProds.map(p => {
          const cover = resolveProductCover(p);
          const validImgs = Array.isArray(p.images)
            ? p.images.filter(img => img && typeof img === 'string' && img.trim() !== '')
            : [];
          return {
            id: p.id,
            name: p.name,
            tag: p.tag,
            category: p.category,
            price: Math.round(Number(p.price)),
            oldPrice: p.old_price ? Math.round(Number(p.old_price)) : null,
            sizes: Array.isArray(p.sizes) ? p.sizes : ['S', 'M', 'L', 'XL'],
            genders: Array.isArray(p.genders) ? p.genders : ['Male', 'Female'],
            inStock: p.in_stock !== false,
            badge: p.badge || '',
            image: cover,
            images: validImgs.length > 0 ? validImgs : [cover],
            description: p.description || ''
          };
        });
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
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: () => { } });

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

  const handleSubmit = async (e) => {
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
      price: Math.round(Number(formData.price)),
      oldPrice: formData.oldPrice ? Math.round(Number(formData.oldPrice)) : null,
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
    await supabaseApi.upsertProduct(productPayload);
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

  if (isAuthorized === null) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0f172a',
        color: '#f8fafc',
        fontSize: '15px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <RefreshCw size={20} className="spinning" />
          <span>Đang xác thực quyền Admin...</span>
        </div>
      </div>
    );
  }

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
          <button className="btn-secondary" onClick={handleResetDefaults} style={{ display: 'none' }}>
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
                  {allCategories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
                {/* Input thêm danh mục mới */}
                <div className="add-category-row">
                  <input
                    type="text"
                    className="add-category-input"
                    value={newCategoryInput}
                    onChange={e => setNewCategoryInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCategory(); } }}
                    placeholder="Nhập danh mục mới rồi nhấn Enter..."
                  />
                  <button
                    type="button"
                    className="btn-add-category"
                    onClick={handleAddCategory}
                    title="Thêm danh mục"
                  >
                    +
                  </button>
                </div>
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
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = bcn;
                    }}
                  />
                </div>
                <div className="cover-input-fields">
                  <input
                    type="text"
                    value={formData.primaryImage}
                    onChange={(e) => setFormData({ ...formData, primaryImage: e.target.value })}
                    placeholder="URL ảnh bìa chính hoặc tải từ máy tính..."
                  />
                  <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
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
                      <img
                        src={imgUrl || bcn}
                        alt={`Góc chụp ${idx + 1}`}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = bcn;
                        }}
                      />
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
              <button
                type="button"
                className={`btn-secondary ${activeTab === 'users' ? 'tab-active' : ''}`}
                onClick={() => { setActiveTab('users'); fetchUsers(); }}
                style={{
                  background: activeTab === 'users' ? '#7c3aed' : undefined,
                  color: activeTab === 'users' ? '#fff' : undefined,
                  borderColor: activeTab === 'users' ? '#7c3aed' : undefined,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Users size={15} />
                Zalo Users ({users.length})
              </button>
              <button
                type="button"
                className={`btn-secondary ${activeTab === 'accounts' ? 'tab-active' : ''}`}
                onClick={() => { setActiveTab('accounts'); fetchAccounts(); }}
                style={{
                  background: activeTab === 'accounts' ? '#059669' : undefined,
                  color: activeTab === 'accounts' ? '#fff' : undefined,
                  borderColor: activeTab === 'accounts' ? '#059669' : undefined,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <KeyRound size={15} />
                Tài Khoản ({accounts.length})
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

          {activeTab === 'products' && (
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
                        <td data-label="Ảnh">
                          <div className="table-img-wrap">
                            <img
                              src={resolveProductCover(item)}
                              alt={item.name}
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = bcn;
                              }}
                            />
                            {item.images && item.images.length > 1 && (
                              <span className="img-count-tag">+{item.images.length}</span>
                            )}
                          </div>
                        </td>
                        <td data-label="Sản phẩm">
                          <div>
                            <div className="table-name">{item.name}</div>
                            <div className="table-tag">{item.tag}</div>
                          </div>
                        </td>
                        <td data-label="Danh mục">
                          <span className="cat-badge">{item.category}</span>
                        </td>
                        <td data-label="Giá">
                          <div>
                            <div className="table-price">{item.price?.toLocaleString('vi-VN')} đ</div>
                            {item.oldPrice && (
                              <div className="table-oldprice">{item.oldPrice?.toLocaleString('vi-VN')} đ</div>
                            )}
                          </div>
                        </td>
                        <td data-label="Trạng thái">
                          <span className={`status-pill ${item.inStock ? 'in-stock' : 'out-stock'}`}>
                            {item.inStock ? 'Còn hàng' : 'Hết hàng'}
                          </span>
                        </td>
                        <td data-label="Thao tác">
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
          )}

          {/* ── TAB ĐƠN HÀNG ─────────────────────────────── */}
          {activeTab === 'orders' && (
            <div className="product-table-wrapper">
              <table className="product-table">
                <thead>
                  <tr>
                    <th>Mã Đơn</th>
                    <th>Khách Hàng</th>
                    <th>Sản Phẩm</th>
                    <th>Phân Loại</th>
                    <th>SL</th>
                    <th>Tổng Tiền</th>
                    <th>Thanh Toán</th>
                    <th>Thời Gian</th>
                    <th>Xóa</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '35px', color: '#94a3b8' }}>
                        Chưa có đơn hàng nào. Khi User bấm Đặt Hàng, đơn sẽ xuất hiện tại đây!
                      </td>
                    </tr>
                  ) : (
                    orders.map((ord) => (
                      <tr key={`${ord.order_code}-${ord.id}`}>
                        <td data-label="Mã đơn">
                          <span style={{ fontWeight: 700, color: '#0284c7' }}>
                            #{ord.order_code || ord.id}
                          </span>
                        </td>
                        <td data-label="Khách hàng">
                          <div>
                            <div style={{ fontWeight: 600 }}>{ord.name}</div>
                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>ID: {ord.zalo_id || 'guest'}</div>
                          </div>
                        </td>
                        <td data-label="Sản phẩm">
                          <div style={{ fontWeight: 600 }}>{ord.product_name}</div>
                        </td>
                        <td data-label="Phân loại">
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            <span className="cat-badge">{ord.gender}</span>
                            <span className="cat-badge" style={{ fontWeight: 700 }}>Size {ord.size}</span>
                          </div>
                        </td>
                        <td data-label="SL" style={{ fontWeight: 700 }}>
                          {ord.quantity}
                        </td>
                        <td data-label="Tổng tiền">
                          <div className="table-price">
                            {Number(ord.total_price || (ord.price * ord.quantity) || 0).toLocaleString('vi-VN')} đ
                          </div>
                        </td>
                        <td data-label="Thanh toán">
                          {ord.status === 'CANCELLED' || ord.payment_status === 'CANCELLED' ? (
                            <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#f87171' }}>
                              CANCELLED
                            </span>
                          ) : ord.payment_status === 'PAID' ? (
                            <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.4)', color: '#34d399' }}>
                              PAID
                            </span>
                          ) : (
                            <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.35)', color: '#fbbf24' }}>
                              PENDING
                            </span>
                          )}
                        </td>
                        <td data-label="Thời gian" style={{ fontSize: '12px', color: '#94a3b8' }}>
                          {ord.created_at ? new Date(ord.created_at).toLocaleString('vi-VN') : 'Vừa xong'}
                        </td>
                        <td data-label="Xóa">
                          <button
                            className="btn-icon delete"
                            onClick={() => handleDeleteOrder(ord)}
                            title="Xóa đơn hàng này"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ── TAB TÀI KHOẢN ─────────────────────────────── */}
          {activeTab === 'users' && (() => {
            const filteredUsers = users.filter((u) => {
              if (!userSearchQuery.trim()) return true;
              const q = userSearchQuery.trim().toLowerCase();
              const name = (u.name || '').toLowerCase();
              const zaloId = (u.zalo_id || '').toLowerCase();
              return name.includes(q) || zaloId.includes(q);
            });

            return (
              <div className="product-table-wrapper">
                <div style={{ padding: '12px 16px', background: 'rgba(124,58,237,0.08)', borderRadius: '10px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#a78bfa' }}>
                  <Shield size={15} />
                  Quản lý tài khoản đăng nhập qua Zalo. Người dùng tự động xuất hiện khi đăng nhập lần đầu.
                </div>

                {/* Thanh tìm kiếm tên tài khoản */}
                <div className="admin-user-search-wrap" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ position: 'relative', flex: 1, maxWidth: '360px' }}>
                    <Search
                      size={16}
                      style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#94a3b8',
                        pointerEvents: 'none'
                      }}
                    />
                    <input
                      type="text"
                      className="admin-user-search-input"
                      placeholder="Tìm theo tên hoặc Zalo ID..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 36px 9px 36px',
                        borderRadius: '10px',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        background: 'rgba(255, 255, 255, 0.05)',
                        color: 'inherit',
                        fontSize: '13px',
                        outline: 'none',
                        transition: 'border-color 0.2s, background 0.2s'
                      }}
                    />
                    {userSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setUserSearchQuery('')}
                        style={{
                          position: 'absolute',
                          right: '10px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: '#94a3b8',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '2px',
                          borderRadius: '50%'
                        }}
                        title="Xóa tìm kiếm"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                    {userSearchQuery.trim() ? `Tìm thấy ${filteredUsers.length}/${users.length}` : `Tổng: ${users.length}`}
                  </span>
                </div>

                <table className="product-table">
                  <thead>
                    <tr>
                      <th>Người Dùng</th>
                      <th>Zalo ID</th>
                      <th>Quyền Hạn</th>
                      <th>Đăng Nhập Cuối</th>
                      <th>Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '35px', color: '#94a3b8' }}>
                          {userSearchQuery.trim()
                            ? `Không tìm thấy tài khoản nào khớp với "${userSearchQuery}".`
                            : 'Chưa có tài khoản nào. Người dùng sẽ xuất hiện tại đây khi đăng nhập qua Zalo!'}
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => (
                        <tr key={u.zalo_id}>
                          <td data-label="Người dùng">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ position: 'relative', flexShrink: 0 }}>
                                {u.avatar ? (
                                  <img
                                    src={u.avatar}
                                    alt={u.name}
                                    title={u.name}
                                    referrerPolicy="no-referrer"
                                    crossOrigin="anonymous"
                                    style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(0,120,255,0.6)', display: 'block' }}
                                    onError={(e) => {
                                      const parent = e.target.parentNode;
                                      e.target.remove();
                                      const fallback = document.createElement('div');
                                      fallback.textContent = (u.name?.[0] || '?').toUpperCase();
                                      fallback.title = u.name || '';
                                      fallback.style.cssText = 'width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,rgba(0,120,255,0.5),rgba(59,130,246,0.35));display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;color:#e2e8f0;border:2px solid rgba(0,120,255,0.5);';
                                      parent.appendChild(fallback);
                                    }}
                                  />
                                ) : (
                                  <div title={u.name} style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,rgba(0,120,255,0.5),rgba(59,130,246,0.35))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: 700, color: '#e2e8f0', border: '2px solid rgba(0,120,255,0.5)' }}>
                                    {(u.name?.[0] || '?').toUpperCase()}
                                  </div>
                                )}
                                {/* Badge Zalo */}
                                <span style={{ position: 'absolute', bottom: -2, right: -2, background: '#0068ff', borderRadius: '50%', width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '7px', fontWeight: 800, color: '#fff', border: '1.5px solid #1e293b', letterSpacing: '-0.5px' }}>Z</span>
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 600 }}>{u.name || 'Ẩn danh'}</div>
                                <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                                  Tham gia: {u.created_at ? new Date(u.created_at).toLocaleDateString('vi-VN') : 'N/A'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td data-label="Zalo ID">
                            <code style={{ fontSize: '11px', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '6px', color: '#94a3b8', wordBreak: 'break-all' }}>
                              {u.zalo_id}
                            </code>
                          </td>
                          <td data-label="Quyền hạn">
                            <select
                              value={u.role || 'user'}
                              onChange={(e) => handleUpdateRole(u, e.target.value)}
                              style={{
                                background: u.role === 'admin' ? 'rgba(124,58,237,0.2)' : 'rgba(16,185,129,0.15)',
                                border: `1px solid ${u.role === 'admin' ? 'rgba(124,58,237,0.5)' : 'rgba(16,185,129,0.4)'}`,
                                color: u.role === 'admin' ? '#c4b5fd' : '#6ee7b7',
                                borderRadius: '8px',
                                padding: '4px 10px',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                outline: 'none',
                                maxWidth: '120px',
                                width: 'auto'
                              }}
                            >
                              <option value="user">User</option>
                              <option value="admin">Admin</option>
                            </select>
                          </td>
                          <td data-label="Đăng nhập cuối" style={{ fontSize: '12px', color: '#94a3b8' }}>
                            {u.last_login ? new Date(u.last_login).toLocaleString('vi-VN') : 'Chưa đăng nhập'}
                          </td>
                          <td data-label="Xóa">
                            <button
                              className="btn-icon delete"
                              onClick={() => handleDeleteUser(u)}
                              title="Xóa tài khoản này"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            );
          })()}

          {/* ── TAB TẠO TÀI KHOẢN NỘI BỘ ───────────────────────────── */}
          {activeTab === 'accounts' && (
            <div className="product-table-wrapper">
              {/* Banner mô tả */}
              <div style={{ padding: '12px 16px', background: 'rgba(5,150,105,0.1)', borderRadius: '10px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#6ee7b7' }}>
                <KeyRound size={15} />
                Tạo tài khoản đăng nhập nội bộ. Người dùng dùng tài khoản này để đăng nhập tại trang Login.
              </div>

              {/* Form tạo tài khoản */}
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(5,150,105,0.25)', borderRadius: '14px', padding: '24px', marginBottom: '28px' }}>
                <h3 style={{ margin: '0 0 18px', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: '#6ee7b7' }}>
                  <UserPlus size={17} /> Tạo Tài Khoản Mới
                </h3>
                <form onSubmit={handleCreateAccount}>
                  <div className="form-row" style={{ gap: '14px', flexWrap: 'wrap' }}>
                    <div className="form-group" style={{ flex: '1 1 200px', minWidth: '160px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px', display: 'block', color: '#94a3b8' }}>Tên đăng nhập *</label>
                      <input
                        type="text"
                        value={accountForm.username}
                        onChange={e => setAccountForm(prev => ({ ...prev, username: e.target.value }))}
                        placeholder="VD: admin01, bcnuser"
                        autoComplete="off"
                        required
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div className="form-group" style={{ flex: '1 1 200px', minWidth: '160px', position: 'relative' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px', display: 'block', color: '#94a3b8' }}>Mật khẩu * (tối thiểu 6 ký tự)</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showAccountPassword ? 'text' : 'password'}
                          value={accountForm.password}
                          onChange={e => setAccountForm(prev => ({ ...prev, password: e.target.value }))}
                          placeholder="••••••••"
                          autoComplete="new-password"
                          required
                          style={{ width: '100%', paddingRight: '40px' }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowAccountPassword(p => !p)}
                          style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', padding: 0 }}
                          title={showAccountPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                        >
                          {showAccountPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <div className="form-group" style={{ flex: '1 1 200px', minWidth: '160px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px', display: 'block', color: '#94a3b8' }}>Tên hiển thị</label>
                      <input
                        type="text"
                        value={accountForm.displayName}
                        onChange={e => setAccountForm(prev => ({ ...prev, displayName: e.target.value }))}
                        placeholder="VD: Nguyễn Văn A"
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div className="form-group" style={{ flex: '0 1 140px', minWidth: '120px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px', display: 'block', color: '#94a3b8' }}>Quyền hạn</label>
                      <select
                        value={accountForm.role}
                        onChange={e => setAccountForm(prev => ({ ...prev, role: e.target.value }))}
                        style={{ width: '100%', background: accountForm.role === 'admin' ? 'rgba(124,58,237,0.2)' : 'rgba(16,185,129,0.15)', border: `1px solid ${accountForm.role === 'admin' ? 'rgba(124,58,237,0.5)' : 'rgba(16,185,129,0.4)'}`, color: accountForm.role === 'admin' ? '#c4b5fd' : '#6ee7b7', borderRadius: '8px', padding: '8px 10px', fontSize: '13px', fontWeight: 700, outline: 'none' }}
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ marginTop: '16px' }}>
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={accountFormLoading}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: accountFormLoading ? '#374151' : '#059669', borderColor: '#059669', opacity: accountFormLoading ? 0.7 : 1 }}
                    >
                      {accountFormLoading ? <RefreshCw size={15} className="spinning" /> : <UserPlus size={15} />}
                      {accountFormLoading ? 'Đang tạo...' : 'Tạo tài khoản'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Danh sách tài khoản */}
              <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Lock size={14} /> Danh Sách Tài Khoản Nội Bộ
                </h3>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>Tổng: {accounts.length} tài khoản</span>
              </div>
              <table className="product-table">
                <thead>
                  <tr>
                    <th>Tên đăng nhập</th>
                    <th>Tên hiển thị</th>
                    <th>Quyền hạn</th>
                    <th>Ngày tạo</th>
                    <th>Đăng nhập cuối</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '35px', color: '#94a3b8' }}>
                        Chưa có tài khoản nào. Hãy tạo tài khoản đầu tiên!
                      </td>
                    </tr>
                  ) : (
                    accounts.map((acc) => (
                      <tr key={acc.id}>
                        <td data-label="Tên đăng nhập">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(5,150,105,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>
                              {acc.username?.[0]?.toUpperCase() || '?'}
                            </div>
                            <code style={{ fontSize: '12px', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '6px', color: '#6ee7b7', fontWeight: 700 }}>{acc.username}</code>
                          </div>
                        </td>
                        <td data-label="Tên hiển thị" style={{ fontSize: '13px' }}>{acc.display_name || acc.username}</td>
                        <td data-label="Quyền hạn">
                          <span style={{ background: acc.role === 'admin' ? 'rgba(124,58,237,0.2)' : 'rgba(16,185,129,0.15)', border: `1px solid ${acc.role === 'admin' ? 'rgba(124,58,237,0.5)' : 'rgba(16,185,129,0.4)'}`, color: acc.role === 'admin' ? '#c4b5fd' : '#6ee7b7', borderRadius: '8px', padding: '3px 10px', fontSize: '11px', fontWeight: 700 }}>
                            {acc.role === 'admin' ? 'Admin' : 'User'}
                          </span>
                        </td>
                        <td data-label="Ngày tạo" style={{ fontSize: '12px', color: '#94a3b8' }}>
                          {acc.created_at ? new Date(acc.created_at).toLocaleDateString('vi-VN') : 'N/A'}
                        </td>
                        <td data-label="Đăng nhập cuối" style={{ fontSize: '12px', color: '#94a3b8' }}>
                          {acc.last_login ? new Date(acc.last_login).toLocaleString('vi-VN') : 'Chưa đăng nhập'}
                        </td>
                        <td data-label="Xóa">
                          <button
                            className="btn-icon delete"
                            onClick={() => handleDeleteAccount(acc)}
                            title="Xóa tài khoản này"
                          >
                            <Trash2 size={15} />
                          </button>
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
