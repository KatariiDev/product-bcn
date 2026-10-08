import React, { useState, useEffect, useRef } from 'react';
import './Admin.css';
import { Plus, Trash2, Edit3, Image as ImageIcon, Save, ArrowLeft, RefreshCw, X, Upload, Star, Sun, Moon, ShoppingBag, CheckCircle, Clock, Users, Shield, UserCheck, Search, KeyRound, Eye, EyeOff, UserPlus, Lock, Package, FileSpreadsheet, Menu, ArrowUpDown, Download, History, User as UserIcon } from 'lucide-react';
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
  const [isSyncing, setIsSyncing] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(null);
  const [mobileAsideOpen, setMobileAsideOpen] = useState(false);
  const fileInputRef = useRef(null);
  const coverFileInputRef = useRef(null);

  // Aside main navigation tab: 'products' | 'orders' | 'accounts' | 'export'
  const [activeMainTab, setActiveMainTab] = useState('products');

  // Search queries for each section
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [accountSearchQuery, setAccountSearchQuery] = useState('');

  // Orders sub-tab: 'all' | 'paid' | 'pending'
  const [orderPaymentTab, setOrderPaymentTab] = useState('all');

  // Accounts sub-tab: 'zalo' | 'create' | 'password'
  const [accountSubTab, setAccountSubTab] = useState('zalo');

  // Form tạo tài khoản nội bộ
  const [accountForm, setAccountForm] = useState({ username: '', password: '', displayName: '', role: 'user' });
  const [accountFormLoading, setAccountFormLoading] = useState(false);
  const [showAccountPassword, setShowAccountPassword] = useState(false);

  // Form đổi mật khẩu tài khoản nội bộ
  const [changePasswordForm, setChangePasswordForm] = useState({ accountId: '', newPassword: '', confirmPassword: '' });
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Export File states
  const [exportSortField, setExportSortField] = useState('created_at'); // 'created_at' | 'total_price' | 'quantity' | 'name'
  const [exportSortOrder, setExportSortOrder] = useState('desc'); // 'asc' | 'desc'
  const [exportHistory, setExportHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('aobcn_export_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Xuất danh sách đơn hàng ra file CSV (Excel mở được, hỗ trợ tiếng Việt)
  const exportOrdersToXlsx = (orderList) => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    const hh = String(today.getHours()).padStart(2, '0');
    const mi = String(today.getMinutes()).padStart(2, '0');
    const ss = String(today.getSeconds()).padStart(2, '0');
    const fileName = `Don_hang_BCN_${dd}-${mm}-${yyyy}_${hh}-${mi}-${ss}.csv`;

    const headers = ['Mã Đơn', 'Khách Hàng', 'Sản Phẩm', 'Phân Loại', 'SL', 'Tổng Tiền (đ)', 'Thanh Toán', 'Thời Gian'];
    const rows = orderList.map(o => [
      o.order_code || o.id || '',
      o.name || '',
      o.product_name || '',
      `${o.gender === 'Female' ? 'Nữ' : 'Nam'} / Size ${o.size || ''}`,
      o.quantity || 1,
      Number(o.total_price || (o.price * (o.quantity || 1)) || 0),
      o.status === 'CANCELLED' || o.payment_status === 'CANCELLED' ? 'CANCELLED' : o.payment_status === 'PAID' ? 'PAID' : 'PENDING',
      o.created_at ? '\t' + new Date(o.created_at).toLocaleString('vi-VN') : 'Không rõ'
    ]);

    const escapeCell = (val) => {
      const s = String(val);
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const csvContent = [headers, ...rows]
      .map(row => row.map(escapeCell).join(','))
      .join('\r\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);

    // Ghi lại lịch sử xuất file
    try {
      const savedUser = localStorage.getItem('zalo_user');
      const currentUser = savedUser ? JSON.parse(savedUser) : null;
      const exporterName = currentUser?.name || currentUser?.display_name || currentUser?.username || 'Admin';

      const newHistoryItem = {
        id: `exp-${Date.now()}`,
        fileName,
        exporter: exporterName,
        exportTime: new Date().toLocaleString('vi-VN'),
        recordCount: orderList.length
      };

      const updatedHistory = [newHistoryItem, ...exportHistory].slice(0, 30);
      setExportHistory(updatedHistory);
      localStorage.setItem('aobcn_export_history', JSON.stringify(updatedHistory));
      showToast(`Đã xuất thành công ${orderList.length} đơn hàng!`, 'success', 'Xuất file thành công');
    } catch (err) {
      console.warn('Lỗi lưu lịch sử xuất:', err);
    }
  };

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

  // Polling role và kiểm tra tài khoản còn tồn tại mỗi 5s
  useEffect(() => {
    const pollRole = async () => {
      try {
        const saved = localStorage.getItem('zalo_user');
        if (!saved) return;
        const u = JSON.parse(saved);
        const zaloId = u.id || u.zalo_id;
        if (!zaloId) return;

        // Kiểm tra tài khoản có bị xóa không
        const exists = await supabaseApi.checkUserExists(zaloId);
        if (!exists) {
          localStorage.removeItem('zalo_user');
          localStorage.removeItem('zalo_user_role');
          sessionStorage.setItem('auth_error', 'Tài khoản của bạn đã bị xóa khỏi hệ thống!');
          window.location.href = '/';
          return;
        }

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

  const handleUpdateAccountRole = async (acc, newRole) => {
    const ok = await supabaseApi.updateAccountRole(acc.id, newRole);
    if (ok) {
      setAccounts(prev => prev.map(a => a.id === acc.id ? { ...a, role: newRole } : a));
      showToast(`Đã cập nhật quyền ${newRole === 'admin' ? 'Admin' : 'User'} cho tài khoản "${acc.username}"!`, 'success', 'Cập nhật quyền');
    } else {
      showToast('Cập nhật quyền thất bại. Vui lòng thử lại!', 'error', 'Lỗi');
    }
  };

  const handleChangeAccountPassword = async (e) => {
    e.preventDefault();
    const { accountId, newPassword, confirmPassword } = changePasswordForm;
    if (!accountId) {
      showToast('Vui lòng chọn tài khoản cần đổi mật khẩu!', 'warning', 'Chưa chọn tài khoản');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      showToast('Mật khẩu mới phải có ít nhất 6 ký tự!', 'error', 'Mật khẩu yếu');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Xác nhận mật khẩu không khớp!', 'error', 'Mật khẩu không khớp');
      return;
    }
    setChangePasswordLoading(true);
    try {
      const ok = await supabaseApi.changeAccountPassword(accountId, newPassword);
      if (ok) {
        showToast('Đã đổi mật khẩu tài khoản thành công!', 'success', 'Đổi mật khẩu thành công');
        setChangePasswordForm({ accountId: '', newPassword: '', confirmPassword: '' });
      } else {
        showToast('Đổi mật khẩu thất bại. Vui lòng thử lại!', 'error', 'Lỗi');
      }
    } finally {
      setChangePasswordLoading(false);
    }
  };

  const handleDeleteAccount = (acc) => {
    setConfirmModal({
      isOpen: true,
      title: 'Xóa Tài Khoản Nội Bộ',
      message: `Xóa tài khoản "${acc.username}" (${acc.display_name}) khỏi Supabase? Thao tác này không thể hoàn tác.`,
      confirmText: 'Xóa tài khoản',
      cancelText: 'Giữ lại',
      danger: true,
      onConfirm: async () => {
        await supabaseApi.deleteAccount(acc.id);
        setAccounts(prev => prev.filter(a => a.id !== acc.id));
        showToast(`Đã xóa tài khoản "${acc.username}" khỏi Supabase!`, 'success', 'Đã xóa');
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

  const [themeMode, setThemeMode] = useState(() => {
    const saved = localStorage.getItem('app_theme_mode');
    return saved === 'light' ? 'light' : 'dark';
  });

  const toggleThemeMode = () => {
    const nextMode = themeMode === 'light' ? 'dark' : 'light';
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
      <div className="admin-layout-wrapper">
        {/* Lớp phủ màn hình nhỏ khi mở aside */}
        <div
          className={`admin-aside-overlay ${mobileAsideOpen ? 'open' : ''}`}
          onClick={() => setMobileAsideOpen(false)}
        />

        {/* ── ASIDE BÊN TRÁI ───────────────────────────────────────── */}
        <aside className={`admin-aside ${mobileAsideOpen ? 'open' : ''}`}>
          {/* Trên cùng aside: Logo và "Ban Công Nghệ" */}
          <div className="aside-brand">
            <img src={bcn} alt="Ban Công Nghệ" className="aside-logo" />
            <div>
              <div className="aside-title-text">Ban Công Nghệ</div>
              <div className="aside-subtitle">Admin Portal BCN 2026</div>
            </div>
          </div>

          {/* 4 Mục điều hướng chính */}
          <nav className="aside-nav">
            {/* Mục 1: Sản phẩm */}
            <button
              type="button"
              className={`aside-nav-btn ${activeMainTab === 'products' ? 'active' : ''}`}
              onClick={() => {
                setActiveMainTab('products');
                setMobileAsideOpen(false);
              }}
            >
              <Package size={18} />
              <span>Sản phẩm</span>
              <span className="aside-badge">{products.length}</span>
            </button>

            {/* Mục 2: Đơn hàng */}
            <button
              type="button"
              className={`aside-nav-btn ${activeMainTab === 'orders' ? 'active' : ''}`}
              onClick={() => {
                setActiveMainTab('orders');
                fetchOrdersOnly();
                setMobileAsideOpen(false);
              }}
            >
              <ShoppingBag size={18} />
              <span>Đơn hàng</span>
              <span className="aside-badge">{orders.length}</span>
            </button>

            {/* Mục 3: Tài khoản */}
            <button
              type="button"
              className={`aside-nav-btn ${activeMainTab === 'accounts' ? 'active' : ''}`}
              onClick={() => {
                setActiveMainTab('accounts');
                fetchUsers();
                fetchAccounts();
                setMobileAsideOpen(false);
              }}
            >
              <Users size={18} />
              <span>Tài khoản</span>
              <span className="aside-badge">{users.length}</span>
            </button>

            {/* Mục 4: Xuất file */}
            <button
              type="button"
              className={`aside-nav-btn ${activeMainTab === 'export' ? 'active' : ''}`}
              onClick={() => {
                setActiveMainTab('export');
                setMobileAsideOpen(false);
              }}
            >
              <FileSpreadsheet size={18} />
              <span>Xuất file</span>
              <span className="aside-badge">CSV</span>
            </button>
          </nav>

          {/* Dưới cùng aside: Nút chuyển theme & quay lại User */}
          <div className="aside-footer">
            <button
              className="btn-secondary"
              onClick={toggleThemeMode}
              title={`Chế độ theme: ${themeMode === 'light' ? 'Sáng' : 'Tối'}`}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {themeMode === 'light' ? <Sun size={15} /> : <Moon size={15} />}
              <span>Theme: {themeMode === 'light' ? 'Sáng' : 'Tối'}</span>
            </button>

            <Link to="/user" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              <ArrowLeft size={15} /> Xem trang User
            </Link>
          </div>
        </aside>

        {/* ── KHU VỰC NỘI DUNG CHÍNH BÊN PHẢI ──────────────────────── */}
        <main className="admin-main-viewport">
          {/* Thanh Header nhỏ bên phải */}
          <div className="admin-topbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                type="button"
                className="aside-toggle-btn"
                onClick={() => setMobileAsideOpen(true)}
                title="Mở menu"
              >
                <Menu size={18} />
              </button>
              <h2 className="admin-topbar-title">
                {activeMainTab === 'products' && <>📦 Quản Lý Sản Phẩm</>}
                {activeMainTab === 'orders' && <>🛍️ Quản Lý Đơn Hàng</>}
                {activeMainTab === 'accounts' && <>👥 Quản Lý Tài Khoản</>}
                {activeMainTab === 'export' && <>📊 Xuất File Dữ Liệu</>}
              </h2>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="sync-badge">🟢 Supabase Realtime</span>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════
              MỤC 1: SẢN PHẨM
              (Form điền ở trên, danh sách bên dưới, có tìm kiếm)
              ═══════════════════════════════════════════════════════════ */}
          {activeMainTab === 'products' && (() => {
            const filteredProducts = products.filter(p => {
              if (!productSearchQuery.trim()) return true;
              const q = productSearchQuery.trim().toLowerCase();
              return (p.name || '').toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q);
            });

            return (
              <div className="admin-product-stacked-layout">
                {/* Form điền thông tin sản phẩm */}
                <div className="admin-card form-card">
                  <h2>{editingProduct ? 'Chỉnh Sửa Sản Phẩm' : 'Thêm Sản Phẩm Mới'}</h2>
                  <form onSubmit={handleSubmit} className="product-form">
                    <div className="form-group">
                      <label>TÊN SẢN PHẨM *</label>
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
                        <label>PHÂN LOẠI DANH MỤC</label>
                        <select
                          value={formData.category}
                          onChange={e => setFormData({ ...formData, category: e.target.value })}
                        >
                          {allCategories.map(cat => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                          ))}
                        </select>
                        <div className="add-category-row">
                          <input
                            type="text"
                            className="add-category-input"
                            value={newCategoryInput}
                            onChange={e => setNewCategoryInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCategory(); } }}
                            placeholder="Nhập danh mục mới rồi..."
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
                        <label>TAG / NHÃN PHỤ</label>
                        <input
                          type="text"
                          value={formData.tag}
                          onChange={e => setFormData({ ...formData, tag: e.target.value })}
                          placeholder="Limited Edition"
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>GIÁ BÁN (VNĐ) *</label>
                        <input
                          type="number"
                          value={formData.price}
                          onChange={e => setFormData({ ...formData, price: e.target.value })}
                          placeholder="350000"
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>GIÁ GỐC / KHUYẾN MÃI (VNĐ)</label>
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
                        <label>KÍCH THƯỚC</label>
                        <input
                          type="text"
                          value={formData.sizes}
                          onChange={e => setFormData({ ...formData, sizes: e.target.value })}
                          placeholder="S, M, L, XL"
                        />
                      </div>

                      <div className="form-group">
                        <label>GIỚI TÍNH</label>
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
                        <label>BADGE NỔI BẬT</label>
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

                    {/* Ô ĐẶT ẢNH HIỂN THỊ CHÍNH */}
                    <div className="primary-cover-box">
                      <div className="cover-label-row">
                        <label>
                          <Star size={15} className="star-icon" /> ẢNH HIỂN THỊ CHÍNH CỦA SẢN PHẨM
                        </label>
                        <span className="primary-badge-tag">ẢNH ĐẠI DIỆN</span>
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

                    {/* BỘ SƯU TẬP CHI TIẾT */}
                    <div className="images-section">
                      <div className="images-header">
                        <label>
                          BỘ SƯU TẬP CHI TIẾT (TỐI ĐA {MAX_IMAGES} ẢNH)
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
                      <label>MÔ TẢ CHI TIẾT</label>
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

                {/* DANH SÁCH CÁC SẢN PHẨM HIỆN CÓ Ở PHÍA DƯỚI */}
                <div className="admin-card list-card">
                  <div className="list-header" style={{ flexWrap: 'wrap', gap: '14px' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#fff' }}>
                        Danh Sách Sản Phẩm Hiện Có ({filteredProducts.length}/{products.length})
                      </h3>
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>
                        Cho phép chỉnh sửa thông tin hoặc xóa sản phẩm khỏi hệ thống
                      </p>
                    </div>

                    {/* Thanh tìm kiếm tên sản phẩm */}
                    <div className="admin-search-box">
                      <Search size={16} className="search-icon-left" />
                      <input
                        type="text"
                        className="admin-search-input"
                        placeholder="Tìm kiếm theo tên hoặc danh mục..."
                        value={productSearchQuery}
                        onChange={e => setProductSearchQuery(e.target.value)}
                      />
                      {productSearchQuery && (
                        <button
                          type="button"
                          className="search-clear-btn"
                          onClick={() => setProductSearchQuery('')}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="product-table-wrapper">
                    <table className="product-table">
                      <thead>
                        <tr>
                          <th>Hình ảnh</th>
                          <th>Thông tin sản phẩm</th>
                          <th>Danh mục</th>
                          <th>Giá bán</th>
                          <th>Trạng thái</th>
                          <th>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredProducts.length === 0 ? (
                          <tr>
                            <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                              {productSearchQuery.trim()
                                ? `Không tìm thấy sản phẩm nào khớp với "${productSearchQuery}".`
                                : 'Chưa có sản phẩm nào trong hệ thống.'}
                            </td>
                          </tr>
                        ) : (
                          filteredProducts.map((item) => (
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
                                    onClick={() => {
                                      handleEdit(item);
                                      window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    title="Chỉnh sửa sản phẩm này"
                                  >
                                    <Edit3 size={15} />
                                  </button>
                                  <button
                                    className="btn-icon delete"
                                    onClick={() => handleDelete(item.id)}
                                    title="Xóa sản phẩm này"
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
                </div>
              </div>
            );
          })()}

          {/* ═══════════════════════════════════════════════════════════
              MỤC 2: ĐƠN HÀNG
              (Tabs: Đã thanh toán, Đang chờ; tự xóa khách hủy; search mọi trường)
              ═══════════════════════════════════════════════════════════ */}
          {activeMainTab === 'orders' && (() => {
            // Lọc bỏ đơn hàng bị khách hủy (status === 'CANCELLED')
            const nonCancelledOrders = orders.filter(
              o => o.status !== 'CANCELLED' && o.payment_status !== 'CANCELLED'
            );

            // Lọc theo Tab thanh toán
            const tabFiltered = nonCancelledOrders.filter(o => {
              if (orderPaymentTab === 'paid') return o.payment_status === 'PAID';
              if (orderPaymentTab === 'pending') return o.payment_status !== 'PAID';
              return true;
            });

            // Lọc theo thanh tìm kiếm trên mọi trường (mã đơn, tên khách, sản phẩm, zalo id, size, số tiền, ngày...)
            const filteredOrders = tabFiltered.filter(o => {
              if (!orderSearchQuery.trim()) return true;
              const q = orderSearchQuery.trim().toLowerCase();
              const codeStr = String(o.order_code || o.id || '').toLowerCase();
              const nameStr = (o.name || '').toLowerCase();
              const prodStr = (o.product_name || '').toLowerCase();
              const zaloStr = String(o.zalo_id || '').toLowerCase();
              const sizeStr = (o.size || '').toLowerCase();
              const genderStr = (o.gender || '').toLowerCase();
              const priceStr = String(o.total_price || (o.price * o.quantity) || '').toLowerCase();
              const dateStr = o.created_at ? new Date(o.created_at).toLocaleString('vi-VN').toLowerCase() : '';

              return (
                codeStr.includes(q) ||
                nameStr.includes(q) ||
                prodStr.includes(q) ||
                zaloStr.includes(q) ||
                sizeStr.includes(q) ||
                genderStr.includes(q) ||
                priceStr.includes(q) ||
                dateStr.includes(q)
              );
            });

            const paidCount = nonCancelledOrders.filter(o => o.payment_status === 'PAID').length;
            const pendingCount = nonCancelledOrders.filter(o => o.payment_status !== 'PAID').length;

            return (
              <div className="admin-card list-card">
                {/* Control bar: Tabs + Search + Xuất nhanh */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
                    {/* Tabs Đã thanh toán / Đang chờ thanh toán */}
                    <div className="pill-tabs-nav">
                      <button
                        type="button"
                        className={`pill-tab-item ${orderPaymentTab === 'all' ? 'active' : ''}`}
                        onClick={() => setOrderPaymentTab('all')}
                      >
                        Tất cả ({nonCancelledOrders.length})
                      </button>
                      <button
                        type="button"
                        className={`pill-tab-item ${orderPaymentTab === 'paid' ? 'active' : ''}`}
                        onClick={() => setOrderPaymentTab('paid')}
                        style={{ color: orderPaymentTab === 'paid' ? '#fff' : '#34d399' }}
                      >
                        <CheckCircle size={14} />
                        Đã thanh toán ({paidCount})
                      </button>
                      <button
                        type="button"
                        className={`pill-tab-item ${orderPaymentTab === 'pending' ? 'active' : ''}`}
                        onClick={() => setOrderPaymentTab('pending')}
                        style={{ color: orderPaymentTab === 'pending' ? '#fff' : '#fbbf24' }}
                      >
                        <Clock size={14} />
                        Đang chờ thanh toán ({pendingCount})
                      </button>
                    </div>

                    {/* Thanh tìm kiếm theo mọi trường */}
                    <div className="admin-search-box">
                      <Search size={16} className="search-icon-left" />
                      <input
                        type="text"
                        className="admin-search-input"
                        placeholder="Tìm theo mã đơn, khách, sản phẩm, size, tiền..."
                        value={orderSearchQuery}
                        onChange={e => setOrderSearchQuery(e.target.value)}
                      />
                      {orderSearchQuery && (
                        <button
                          type="button"
                          className="search-clear-btn"
                          onClick={() => setOrderSearchQuery('')}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px', color: '#94a3b8' }}>
                    <span>
                      Hiển thị {filteredOrders.length} đơn hàng {orderPaymentTab === 'paid' ? '(Đã thanh toán)' : orderPaymentTab === 'pending' ? '(Đang chờ thanh toán)' : ''} (Đơn bị khách hủy đã tự động loại bỏ)
                    </span>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => exportOrdersToXlsx(filteredOrders)}
                      title="Xuất bảng đơn hàng đang lọc ra CSV"
                      style={{ padding: '6px 14px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#34d399' }}
                    >
                      <Download size={14} /> Xuất {filteredOrders.length} đơn này
                    </button>
                  </div>
                </div>

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
                      {filteredOrders.length === 0 ? (
                        <tr>
                          <td colSpan={9} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                            {orderSearchQuery.trim()
                              ? `Không tìm thấy đơn hàng nào khớp với từ khóa "${orderSearchQuery}".`
                              : 'Không có đơn hàng nào trong mục này.'}
                          </td>
                        </tr>
                      ) : (
                        filteredOrders.map((ord) => (
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
                                <span className="cat-badge">{ord.gender === 'Female' ? 'Nữ' : 'Nam'}</span>
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
                              {ord.payment_status === 'PAID' ? (
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
              </div>
            );
          })()}

          {/* ═══════════════════════════════════════════════════════════
              MỤC 3: TÀI KHOẢN
              (Gồm 3 mục nhỏ: Tài khoản Zalo, Tạo tài khoản, Đổi mật khẩu;
               Đổi role User/Admin, Xóa tài khoản khỏi Supabase -> reload login,
               Tìm kiếm tên tài khoản)
              ═══════════════════════════════════════════════════════════ */}
          {activeMainTab === 'accounts' && (
            <div className="admin-card list-card">
              {/* Thanh chọn 3 mục nhỏ */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', marginBottom: '22px' }}>
                <div className="pill-tabs-nav">
                  <button
                    type="button"
                    className={`pill-tab-item ${accountSubTab === 'zalo' ? 'active' : ''}`}
                    onClick={() => setAccountSubTab('zalo')}
                  >
                    <Users size={15} />
                    Tài khoản Zalo ({users.length})
                  </button>
                  <button
                    type="button"
                    className={`pill-tab-item ${accountSubTab === 'create' ? 'active' : ''}`}
                    onClick={() => setAccountSubTab('create')}
                  >
                    <UserPlus size={15} />
                    Tạo tài khoản
                  </button>
                  <button
                    type="button"
                    className={`pill-tab-item ${accountSubTab === 'password' ? 'active' : ''}`}
                    onClick={() => setAccountSubTab('password')}
                  >
                    <KeyRound size={15} />
                    Đổi mật khẩu
                  </button>
                </div>

                {/* Thanh tìm kiếm tên tài khoản CHỈ hiển thị ở mục Tài khoản Zalo */}
                {accountSubTab === 'zalo' && (
                  <div className="admin-search-box">
                    <Search size={16} className="search-icon-left" />
                    <input
                      type="text"
                      className="admin-search-input"
                      placeholder="Tìm theo tên hoặc Zalo ID..."
                      value={accountSearchQuery}
                      onChange={e => setAccountSearchQuery(e.target.value)}
                    />
                    {accountSearchQuery && (
                      <button
                        type="button"
                        className="search-clear-btn"
                        onClick={() => setAccountSearchQuery('')}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* ─ Mục con 1: Tài khoản Zalo ─ */}
              {accountSubTab === 'zalo' && (() => {
                const filteredUsers = users.filter(u => {
                  if (!accountSearchQuery.trim()) return true;
                  const q = accountSearchQuery.trim().toLowerCase();
                  return (u.name || '').toLowerCase().includes(q) || (u.zalo_id || '').toLowerCase().includes(q);
                });

                return (
                  <div className="product-table-wrapper">
                    <div style={{ padding: '12px 16px', background: 'rgba(124,58,237,0.08)', borderRadius: '10px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#a78bfa' }}>
                      <Shield size={15} />
                      Tài khoản đăng nhập qua Zalo OAuth. Có thể chỉnh quyền Admin / User hoặc xóa tài khoản khỏi Supabase (tài khoản bị xóa sẽ tự động đăng xuất và reload về trang đăng nhập).
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
                            <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                              {accountSearchQuery.trim()
                                ? `Không tìm thấy tài khoản Zalo nào khớp với "${accountSearchQuery}".`
                                : 'Chưa có tài khoản Zalo nào trong hệ thống.'}
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
                                  title="Xóa tài khoản này khỏi Supabase"
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

              {/* ─ Mục con 2: Tạo tài khoản nội bộ ─ */}
              {accountSubTab === 'create' && (
                <div>
                  <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(5,150,105,0.25)', borderRadius: '14px', padding: '24px', marginBottom: '28px' }}>
                    <h3 style={{ margin: '0 0 18px', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: '#6ee7b7' }}>
                      <UserPlus size={17} /> Tạo Tài Khoản Mới (Nội Bộ)
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
                          {accountFormLoading ? 'Đang tạo...' : 'Tạo tài khoản ngay'}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Danh sách các tài khoản nội bộ */}
                  {(() => {
                    const filteredAccounts = accounts.filter(a => {
                      if (!accountSearchQuery.trim()) return true;
                      const q = accountSearchQuery.trim().toLowerCase();
                      return (a.username || '').toLowerCase().includes(q) || (a.display_name || '').toLowerCase().includes(q);
                    });

                    return (
                      <div className="product-table-wrapper">
                        <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Lock size={14} /> Danh Sách Tài Khoản Nội Bộ Hiện Có
                          </h3>
                          <span style={{ fontSize: '12px', color: '#94a3b8' }}>Tổng: {filteredAccounts.length}/{accounts.length}</span>
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
                            {filteredAccounts.length === 0 ? (
                              <tr>
                                <td colSpan={6} style={{ textAlign: 'center', padding: '35px', color: '#94a3b8' }}>
                                  {accountSearchQuery.trim()
                                    ? `Không tìm thấy tài khoản nào khớp với "${accountSearchQuery}".`
                                    : 'Chưa có tài khoản nội bộ nào. Hãy tạo tài khoản đầu tiên ở trên!'}
                                </td>
                              </tr>
                            ) : (
                              filteredAccounts.map((acc) => (
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
                                    <select
                                      value={acc.role || 'user'}
                                      onChange={(e) => handleUpdateAccountRole(acc, e.target.value)}
                                      style={{
                                        background: acc.role === 'admin' ? 'rgba(124,58,237,0.2)' : 'rgba(16,185,129,0.15)',
                                        border: `1px solid ${acc.role === 'admin' ? 'rgba(124,58,237,0.5)' : 'rgba(16,185,129,0.4)'}`,
                                        color: acc.role === 'admin' ? '#c4b5fd' : '#6ee7b7',
                                        borderRadius: '8px',
                                        padding: '4px 10px',
                                        fontSize: '12px',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        outline: 'none',
                                        maxWidth: '110px',
                                        width: 'auto'
                                      }}
                                    >
                                      <option value="user">User</option>
                                      <option value="admin">Admin</option>
                                    </select>
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
                                      title="Xóa tài khoản này khỏi Supabase"
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
                </div>
              )}

              {/* ─ Mục con 3: Đổi mật khẩu ─ */}
              {accountSubTab === 'password' && (
                <div style={{ maxWidth: '620px' }}>
                  <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(2,132,199,0.25)', borderRadius: '14px', padding: '24px' }}>
                    <h3 style={{ margin: '0 0 18px', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8' }}>
                      <KeyRound size={17} /> Đổi Mật Khẩu Tài Khoản Nội Bộ
                    </h3>

                    <form onSubmit={handleChangeAccountPassword}>
                      <div className="form-group" style={{ marginBottom: '14px' }}>
                        <label>Chọn tài khoản cần đổi mật khẩu *</label>
                        <select
                          value={changePasswordForm.accountId}
                          onChange={e => setChangePasswordForm(prev => ({ ...prev, accountId: e.target.value }))}
                          required
                        >
                          <option value="">-- Chọn tài khoản --</option>
                          {accounts.map(acc => (
                            <option key={acc.id} value={acc.id}>
                              {acc.username} ({acc.display_name || 'Không tên'}) - {acc.role === 'admin' ? 'Admin' : 'User'}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-row" style={{ marginBottom: '16px' }}>
                        <div className="form-group" style={{ position: 'relative' }}>
                          <label>Mật khẩu mới * (tối thiểu 6 ký tự)</label>
                          <div style={{ position: 'relative' }}>
                            <input
                              type={showNewPassword ? 'text' : 'password'}
                              value={changePasswordForm.newPassword}
                              onChange={e => setChangePasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                              placeholder="••••••••"
                              required
                              style={{ paddingRight: '40px' }}
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(p => !p)}
                              style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', padding: 0 }}
                              title={showNewPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                            >
                              {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </div>

                        <div className="form-group">
                          <label>Xác nhận mật khẩu mới *</label>
                          <input
                            type={showNewPassword ? 'text' : 'password'}
                            value={changePasswordForm.confirmPassword}
                            onChange={e => setChangePasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                            placeholder="••••••••"
                            required
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="btn-primary"
                        disabled={changePasswordLoading}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: changePasswordLoading ? '#374151' : '#0284c7', borderColor: '#0284c7', color: '#fff' }}
                      >
                        {changePasswordLoading ? <RefreshCw size={15} className="spinning" /> : <Save size={15} />}
                        {changePasswordLoading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════
              MỤC 4: XUẤT FILE
              (Xem trước xuất những gì, sắp xếp, xuất file CSV/Excel,
               ghi lại lịch sử xuất: người xuất, thời gian xuất)
              ═══════════════════════════════════════════════════════════ */}
          {activeMainTab === 'export' && (() => {
            // Lấy danh sách đơn hàng hợp lệ (loại đơn khách hủy)
            const rawOrders = orders.filter(
              o => o.status !== 'CANCELLED' && o.payment_status !== 'CANCELLED'
            );

            // Sắp xếp theo lựa chọn
            const sortedOrders = [...rawOrders].sort((a, b) => {
              let valA = a[exportSortField];
              let valB = b[exportSortField];

              if (exportSortField === 'total_price') {
                valA = Number(a.total_price || (a.price * a.quantity) || 0);
                valB = Number(b.total_price || (b.price * b.quantity) || 0);
              } else if (exportSortField === 'quantity') {
                valA = Number(a.quantity || 1);
                valB = Number(b.quantity || 1);
              } else if (exportSortField === 'created_at') {
                valA = new Date(a.created_at || 0).getTime();
                valB = new Date(b.created_at || 0).getTime();
              } else {
                valA = String(valA || '').toLowerCase();
                valB = String(valB || '').toLowerCase();
              }

              if (valA < valB) return exportSortOrder === 'asc' ? -1 : 1;
              if (valA > valB) return exportSortOrder === 'asc' ? 1 : -1;
              return 0;
            });

            const totalRevenue = sortedOrders.reduce((sum, o) => sum + Number(o.total_price || (o.price * o.quantity) || 0), 0);
            const totalItems = sortedOrders.reduce((sum, o) => sum + Number(o.quantity || 1), 0);

            return (
              <div className="export-card-panel">
                {/* Control bar sắp xếp & nút xuất */}
                <div className="export-control-bar">
                  <div>
                    <h3 className="export-title">
                      <FileSpreadsheet size={18} color="#10b981" /> Bản Xem Trước & Cấu Hình Xuất Dữ Liệu
                    </h3>
                    <p className="export-desc">
                      Xem trước chính xác dữ liệu trước khi tải về. Hệ thống sẽ tự động lưu lại lịch sử người xuất và thời gian xuất.
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                    <div className="export-sort-group">
                      <span className="export-sort-label">
                        <ArrowUpDown size={14} /> Sắp xếp theo:
                      </span>
                      <select
                        className="export-sort-select"
                        value={exportSortField}
                        onChange={e => setExportSortField(e.target.value)}
                      >
                        <option value="created_at">Thời gian đặt</option>
                        <option value="total_price">Tổng tiền</option>
                        <option value="quantity">Số lượng</option>
                        <option value="name">Tên khách hàng</option>
                      </select>

                      <button
                        type="button"
                        className="btn-secondary export-sort-order-btn"
                        onClick={() => setExportSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
                        title={`Thứ tự: ${exportSortOrder === 'asc' ? 'Tăng dần' : 'Giảm dần'}`}
                      >
                        {exportSortOrder === 'asc' ? '▲ Tăng dần' : '▼ Giảm dần'}
                      </button>
                    </div>

                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => exportOrdersToXlsx(sortedOrders)}
                      style={{ background: '#10b981', borderColor: '#10b981', color: '#fff', padding: '10px 20px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '8px', height: '38px', whiteSpace: 'nowrap' }}
                    >
                      <Download size={16} /> Xuất File CSV
                    </button>
                  </div>
                </div>

                {/* Thống kê nhanh tóm tắt nội dung file xuất */}
                <div className="export-stats-grid">
                  <div className="export-stat-card">
                    <div className="export-stat-label">Số dòng dữ liệu</div>
                    <div className="export-stat-value stat-val-blue">{sortedOrders.length} đơn</div>
                  </div>
                  <div className="export-stat-card">
                    <div className="export-stat-label">Tổng số sản phẩm</div>
                    <div className="export-stat-value stat-val-purple">{totalItems} cái</div>
                  </div>
                  <div className="export-stat-card">
                    <div className="export-stat-label">Tổng giá trị xuất</div>
                    <div className="export-stat-value stat-val-green">{totalRevenue.toLocaleString('vi-VN')} đ</div>
                  </div>
                  <div className="export-stat-card">
                    <div className="export-stat-label">Định dạng file</div>
                    <div className="export-stat-value stat-val-amber">CSV UTF-8 (Excel)</div>
                  </div>
                </div>

                {/* BẢN XEM TRƯỚC DỮ LIỆU SẼ XUẤT */}
                <div className="export-preview-header">
                  <h4 className="export-preview-title">
                    Bản Xem Trước Chi Tiết (8 cột dữ liệu sẽ xuất)
                  </h4>
                  <span className="export-preview-count">Hiển thị {sortedOrders.length} kết quả</span>
                </div>

                <div className="product-table-wrapper" style={{ maxHeight: '380px', overflowY: 'auto' }}>
                  <table className="product-table">
                    <thead>
                      <tr>
                        <th>STT</th>
                        <th>Mã Đơn</th>
                        <th>Khách Hàng</th>
                        <th>Sản Phẩm</th>
                        <th>Phân Loại</th>
                        <th>SL</th>
                        <th>Tổng Tiền</th>
                        <th>Thanh Toán</th>
                        <th>Thời Gian</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedOrders.length === 0 ? (
                        <tr>
                          <td colSpan={9} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                            Không có đơn hàng nào để xuất.
                          </td>
                        </tr>
                      ) : (
                        sortedOrders.map((o, idx) => (
                          <tr key={`${o.order_code}-${o.id}`}>
                            <td data-label="STT" style={{ fontWeight: 700, color: '#94a3b8' }}>{idx + 1}</td>
                            <td data-label="Mã đơn" style={{ fontWeight: 700, color: '#0284c7' }}>#{o.order_code || o.id}</td>
                            <td data-label="Khách hàng">{o.name || ''}</td>
                            <td data-label="Sản phẩm">{o.product_name || ''}</td>
                            <td data-label="Phân loại">{`${o.gender === 'Female' ? 'Nữ' : 'Nam'} / Size ${o.size || ''}`}</td>
                            <td data-label="SL" style={{ fontWeight: 700 }}>{o.quantity || 1}</td>
                            <td data-label="Tổng tiền" style={{ fontWeight: 700, color: '#34d399' }}>
                              {Number(o.total_price || (o.price * (o.quantity || 1)) || 0).toLocaleString('vi-VN')} đ
                            </td>
                            <td data-label="Thanh toán">
                              {o.payment_status === 'PAID' ? (
                                <span style={{ color: '#34d399', fontWeight: 700, fontSize: '11px' }}>PAID</span>
                              ) : (
                                <span style={{ color: '#fbbf24', fontWeight: 700, fontSize: '11px' }}>PENDING</span>
                              )}
                            </td>
                            <td data-label="Thời gian" style={{ fontSize: '12px', color: '#94a3b8' }}>
                              {o.created_at ? new Date(o.created_at).toLocaleString('vi-VN') : 'N/A'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* LỊCH SỬ XUẤT FILE (Người xuất, thời gian xuất, tên file) */}
                <div className="export-history-box">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <h4 className="export-history-title">
                      <History size={16} color="#0284c7" /> Lịch Sử Xuất File Gần Đây
                    </h4>
                    {exportHistory.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setExportHistory([]);
                          localStorage.removeItem('aobcn_export_history');
                        }}
                        style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '11.5px', cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        Xóa lịch sử
                      </button>
                    )}
                  </div>

                  {exportHistory.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px' }}>
                      Chưa có lịch sử xuất file nào. Lịch sử sẽ tự động ghi lại mỗi khi bạn bấm nút "Xuất File CSV".
                    </div>
                  ) : (
                    <div className="product-table-wrapper">
                      <table className="product-table">
                        <thead>
                          <tr>
                            <th>Tên File</th>
                            <th>Người Xuất</th>
                            <th>Số Lượng Đơn</th>
                            <th>Thời Gian Xuất</th>
                          </tr>
                        </thead>
                        <tbody>
                          {exportHistory.map((item) => (
                            <tr key={item.id}>
                              <td data-label="Tên File">
                                <code style={{ fontSize: '12px', color: '#38bdf8', background: 'rgba(2,132,199,0.1)', padding: '2px 8px', borderRadius: '6px' }}>
                                  {item.fileName}
                                </code>
                              </td>
                              <td data-label="Người Xuất">
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                                  <UserIcon size={13} color="#94a3b8" />
                                  {item.exporter}
                                </div>
                              </td>
                              <td data-label="Số Đơn">
                                <span style={{ fontWeight: 700 }}>{item.recordCount} đơn hàng</span>
                              </td>
                              <td data-label="Thời Gian" style={{ fontSize: '12px', color: '#94a3b8' }}>
                                {item.exportTime}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </main>
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
