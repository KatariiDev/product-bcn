import { useEffect, useState } from "react";
import "./User.css";
import { LogOut, Filter, Search, ShoppingBag, Check, Shield, Layers, ChevronRight, ChevronLeft, X, Sparkles, Phone, Mail, MapPin, Heart, ExternalLink, Sun, Moon, ClipboardList, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import bcn from '../src/assets/bcn.png';
import { getStoredProducts, STORAGE_KEY_PRODUCTS, saveStoredProducts } from '../admin/Admin';
import { supabaseApi } from '../src/supabaseClient';
import { Toast, ConfirmModal } from '../src/components/Toast';

function User() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [themeMode, setThemeMode] = useState(() => localStorage.getItem('app_theme_mode') || 'auto');

    // Quản lý Toast Thông báo & Confirm Modal tùy chỉnh
    const [toast, setToast] = useState(null);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: () => { } });

    const showToast = (message, type = 'info', title = '') => {
        setToast({ message, type, title });
        setTimeout(() => {
            setToast(null);
        }, 4000);
    };

    const toggleThemeMode = () => {
        const nextMode = themeMode === 'light' ? 'dark' : themeMode === 'dark' ? 'auto' : 'light';
        setThemeMode(nextMode);
        localStorage.setItem('app_theme_mode', nextMode);
        window.dispatchEvent(new Event('theme_mode_changed'));
    };

    // Danh sách sản phẩm lấy từ Admin (localStorage / mặc định)
    const [products, setProducts] = useState(() => getStoredProducts());
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [activeImageIndex, setActiveImageIndex] = useState(0);

    // Bộ lọc sản phẩm
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [priceRange, setPriceRange] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");

    // Lựa chọn mua hàng
    const [gender, setGender] = useState("Male");
    const [size, setSize] = useState("M");
    const [count, setCount] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [orderSuccess, setOrderSuccess] = useState(null);

    // Quản lý xem lịch sử đơn hàng của người dùng
    const [userOrders, setUserOrders] = useState([]);
    const [showOrdersModal, setShowOrdersModal] = useState(false);

    // Tải danh sách đơn hàng riêng của người dùng từ Supabase
    const fetchUserOrders = async () => {
        const savedUser = localStorage.getItem("zalo_user");
        const currentId = user?.id || user?.zalo_id || (savedUser ? JSON.parse(savedUser)?.id || JSON.parse(savedUser)?.zalo_id : null);
        if (!currentId) return;

        const orders = await supabaseApi.getUserOrders(currentId);
        if (orders && Array.isArray(orders)) {
            setUserOrders(orders);
        }
    };

    const handleCancelOrder = (ord) => {
        const code = ord.order_code || ord.id;
        setConfirmModal({
            isOpen: true,
            title: 'Hủy Đơn Hàng',
            message: `Bạn có chắc chắn muốn hủy đơn hàng #${code} này không? Thao tác này không thể hoàn tác.`,
            confirmText: 'Xác nhận hủy',
            cancelText: 'Giữ lại đơn',
            danger: true,
            onConfirm: async () => {
                // Cập nhật UI ngay lập tức (không chờ Supabase)
                setUserOrders(prev => prev.map(o =>
                    (o.order_code === ord.order_code || o.id === ord.id)
                        ? { ...o, status: 'CANCELLED' }
                        : o
                ));
                showToast(`Đơn hàng #${code} đã được hủy thành công!`, 'success', 'Đã hủy đơn');

                // Background: cập nhật trên Supabase (đồng bộ trạng thái CANCELLED)
                supabaseApi.cancelOrder(ord.order_code, ord.id).catch(() => null);
            }
        });
    };

    useEffect(() => {
        fetchUserOrders();
        const handleOrdersUpdated = () => fetchUserOrders();
        window.addEventListener('orders_updated', handleOrdersUpdated);
        return () => window.removeEventListener('orders_updated', handleOrdersUpdated);
    }, []);

    // Tải sản phẩm từ Supabase khi mở trang (và định kỳ đồng bộ)
    useEffect(() => {
        let isMounted = true;
        const fetchRemoteProducts = async () => {
            const remoteProds = await supabaseApi.getProducts();
            if (isMounted && remoteProds && Array.isArray(remoteProds) && remoteProds.length > 0) {
                const formatted = remoteProds.map(p => ({
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
                    image: p.image || bcn,
                    images: (() => {
                        // Filter bỏ giá trị rỗng, lấy ảnh hợp lệ
                        const validImgs = Array.isArray(p.images)
                            ? p.images.filter(img => img && typeof img === 'string' && img.trim() !== '')
                            : [];
                        const validCover = p.image && p.image.trim() !== '' ? p.image : null;
                        if (validImgs.length > 0) return validImgs;
                        if (validCover) return [validCover];
                        return [bcn];
                    })(),
                    description: p.description || ''
                }));
                setProducts(formatted);
                saveStoredProducts(formatted);
            }
        };

        fetchRemoteProducts();
        // Kiểm tra cập nhật mỗi 5 giây để đồng bộ máy 2 ngay cả khi không reload
        const interval = setInterval(fetchRemoteProducts, 5000);
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, []);

    const [userRole, setUserRole] = useState(() => {
        try {
            const saved = localStorage.getItem("zalo_user_role");
            return saved || 'user';
        } catch {
            return 'user';
        }
    });

    // Lấy thông tin user và role
    useEffect(() => {
        const initUser = async () => {
            try {
                const savedUser = localStorage.getItem("zalo_user");
                if (savedUser) {
                    const userData = JSON.parse(savedUser);
                    setUser(userData);

                    const zaloId = userData.id || userData.zalo_id;
                    if (zaloId) {
                        // 1. Lưu/cập nhật user lên Supabase
                        await supabaseApi.upsertUser(userData).catch(() => null);

                        // 2. Lấy phân quyền thực tế từ Supabase
                        const role = await supabaseApi.getUserRole(zaloId);
                        setUserRole(role);
                        localStorage.setItem("zalo_user_role", role);
                    }
                    // Tải đơn hàng tương ứng với user này
                    fetchUserOrders();
                }
            } catch (error) {
                console.error("Lỗi đọc thông tin user:", error);
            } finally {
                setLoading(false);
            }
        };

        initUser();
    }, []);

    // Lắng nghe cập nhật sản phẩm từ trang Admin (cùng tab hoặc qua storage event)
    useEffect(() => {
        const handleSync = () => {
            const updated = getStoredProducts();
            setProducts(updated);
        };

        window.addEventListener('storage', handleSync);
        window.addEventListener('products_updated', handleSync);

        return () => {
            window.removeEventListener('storage', handleSync);
            window.removeEventListener('products_updated', handleSync);
        };
    }, []);

    // Set sản phẩm được chọn mặc định khi products thay đổi
    useEffect(() => {
        if (products.length > 0 && (!selectedProduct || !products.find(p => p.id === selectedProduct.id))) {
            setSelectedProduct(products[0]);
            setActiveImageIndex(0);
        }
    }, [products, selectedProduct]);

    // Khi đổi sản phẩm, reset lại size / gender phù hợp và active image
    useEffect(() => {
        if (selectedProduct) {
            setActiveImageIndex(0);
            if (selectedProduct.genders && selectedProduct.genders.length > 0) {
                if (!selectedProduct.genders.includes(gender)) {
                    setGender(selectedProduct.genders[0]);
                }
            }
            if (selectedProduct.sizes && selectedProduct.sizes.length > 0) {
                if (!selectedProduct.sizes.includes(size)) {
                    setSize(selectedProduct.sizes[0]);
                }
            }
            setCount(1);
        }
    }, [selectedProduct]);

    // Kiểm tra trạng thái thanh toán từ PayOS redirect về hoặc cảnh báo phân quyền
    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search);
        const paymentStatus = queryParams.get("payment") || queryParams.get("status");
        const orderCode = queryParams.get("orderCode");

        if (paymentStatus === "success" || paymentStatus === "PAID") {
            showToast(`Thanh toán đơn hàng #${orderCode || ''} thành công! Cảm ơn bạn đã mua hàng.`, 'success', 'Thanh toán thành công');
            window.history.replaceState({}, document.title, window.location.pathname);
        } else if (paymentStatus === "cancel" || paymentStatus === "CANCELLED") {
            showToast(`Đơn hàng #${orderCode || ''} đã bị huỷ thanh toán.`, 'warning', 'Huỷ thanh toán');
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        // Hiển thị toast thông báo nếu bị chuyển hướng do không đủ quyền admin
        const authError = sessionStorage.getItem('auth_error');
        if (authError) {
            sessionStorage.removeItem('auth_error');
            showToast(authError, 'error', 'Truy cập bị từ chối');
        }
    }, []);

    const handleLogout = async () => {

        // Xóa toàn bộ dữ liệu lưu trữ phía client
        localStorage.removeItem("zalo_user");
        localStorage.removeItem("zalo_user_role");
        localStorage.removeItem("zalo_login_result");
        localStorage.removeItem("aobcn_orders_cache");
        sessionStorage.clear();

        // Đặt flag: lần đăng nhập tiếp theo popup sẽ xóa session Zalo trước
        localStorage.setItem("zalo_force_relogin", "1");

        // Gọi Zalo logout ngầm qua iframe ẩn (không chuyển trang người dùng sang Zalo)
        try {
            const iframe = document.createElement("iframe");
            iframe.style.display = "none";
            iframe.src = "https://id.zalo.me/account/logout";
            document.body.appendChild(iframe);
            // Chờ 1.5s để Zalo xóa cookie, rồi về trang login
            setTimeout(() => {
                try { document.body.removeChild(iframe); } catch (_) {}
                window.location.href = "/";
            }, 1500);
        } catch {
            window.location.href = "/";
        }
    };

    // Lọc sản phẩm
    const filteredProducts = products.filter((item) => {
        // Tìm kiếm theo tên / tag / mô tả
        const matchesQuery = !searchQuery ||
            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.tag && item.tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));

        // Lọc danh mục
        const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;

        // Lọc trạng thái
        const matchesStatus = statusFilter === "all" ||
            (statusFilter === "inStock" && item.inStock) ||
            (statusFilter === "outOfStock" && !item.inStock);

        // Lọc theo khoảng giá
        let matchesPrice = true;
        if (priceRange === "under300") {
            matchesPrice = item.price < 300000;
        } else if (priceRange === "300to500") {
            matchesPrice = item.price >= 300000 && item.price <= 500000;
        } else if (priceRange === "over500") {
            matchesPrice = item.price > 500000;
        }

        return matchesQuery && matchesCategory && matchesStatus && matchesPrice;
    });

    const handlePurchase = async () => {
        if (!selectedProduct) return;

        if (!selectedProduct.inStock) {
            showToast("Sản phẩm hiện đang tạm hết hàng!", 'warning', 'Tạm hết hàng');
            return;
        }

        if (!gender || gender === "...") {
            showToast("Vui lòng chọn giới tính (Nam / Nữ)!", 'warning', 'Chưa chọn phân loại');
            return;
        }

        if (!size || size === "...") {
            showToast("Vui lòng chọn size áo phù hợp!", 'warning', 'Chưa chọn size');
            return;
        }

        setIsSubmitting(true);

        const orderCode = Number(String(Date.now()).slice(-6));
        const totalAmount = selectedProduct.price * count;

        const orderData = {
            orderCode: orderCode,
            zaloId: user?.id || "guest",
            name: user?.name || "Khách hàng BCN",
            productName: selectedProduct.name,
            productId: selectedProduct.id,
            gender: gender,
            size: size,
            quantity: count,
            price: selectedProduct.price,
            totalPrice: totalAmount,
            description: `BCN ${size} ${orderCode}`.slice(0, 25),
            returnUrl: `${window.location.origin}/user?payment=success&orderCode=${orderCode}`,
            cancelUrl: `${window.location.origin}/user?payment=cancel&orderCode=${orderCode}`,
            createdAt: new Date().toISOString()
        };

        console.log("Đang tạo đơn hàng và thanh toán:", orderData);

        try {
            // 1. Luôn lưu đơn hàng trực tiếp lên Supabase Database (Đồng bộ mọi máy ngay tức thì!)
            await supabaseApi.createOrder(orderData);

            let checkoutUrl = null;

            // 2. Thử gọi BE PayOS với timeout 3 giây (tránh bị block bởi auth prompt)
            const apiUrl = import.meta.env.VITE_API_URL;
            if (apiUrl) {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 3000);

                    const response = await fetch(`${apiUrl}/api/create-payment-link`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(orderData),
                        signal: controller.signal,
                        credentials: "omit" // Không gửi cookies/credentials để tránh auth prompt
                    });
                    clearTimeout(timeoutId);

                    if (response.ok) {
                        const data = await response.json();
                        checkoutUrl = data.checkoutUrl || data.data?.checkoutUrl;
                    }

                    // Fire-and-forget: lưu vào BE orders (không chờ)
                    fetch(`${apiUrl}/api/orders`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(orderData),
                        credentials: "omit"
                    }).catch(() => null);

                } catch (beErr) {
                    // Timeout hoặc BE không khả dụng -> bỏ qua, đơn đã lưu Supabase rồi
                    console.warn("BE không khả dụng (timeout/lỗi), đơn đã lưu Supabase:", beErr.name);
                }
            }

            // Nếu Backend trả về link checkout của PayOS -> Chuyển hướng sang PayOS
            if (checkoutUrl) {
                window.location.href = checkoutUrl;
                return;
            }

            // Hiển thị thông báo đặt hàng thành công
            showToast(`Mã đơn #${orderCode} - Tổng tiền: ${totalAmount.toLocaleString('vi-VN')} đ. Đã lưu hệ thống!`, 'success', 'Đặt hàng thành công 🎉');

            // Cập nhật trạng thái thành công cho giao diện & làm mới danh sách đơn hàng
            setOrderSuccess(orderData);
            fetchUserOrders();
        } catch (error) {
            console.error("Lỗi đặt hàng:", error);
            showToast("Có lỗi khi xử lý đơn hàng. Vui lòng thử lại!", 'error', 'Đặt hàng thất bại');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="user-loading-screen">
                <div className="spinner"></div>
                <h2>Đang tải thông tin BCN Store...</h2>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="user-unauth-screen">
                <div className="unauth-box">
                    <img src={bcn} alt="Logo" className="unauth-logo" />
                    <h2>Bạn chưa đăng nhập</h2>
                    <p>Vui lòng đăng nhập qua Zalo để xem và đặt đồng phục Ban Công Nghệ</p>
                    <button
                        onClick={() => window.location.href = "/"}
                        className="btn-login-redirect"
                    >
                        Quay lại Đăng nhập
                    </button>
                </div>
            </div>
        );
    }

    const availableSizes = selectedProduct?.sizes || (
        gender === 'Male' ? ["S", "M", "L", "XL"] : ["XS", "S", "M", "L"]
    );

    const availableGenders = selectedProduct?.genders || ["Male", "Female"];

    // Danh sách ảnh hợp lệ của sản phẩm được chọn (filter bỏ giá trị rỗng)
    const productImages = (() => {
        const imgs = (selectedProduct?.images || []).filter(img => img && img.trim() !== '');
        if (imgs.length > 0) return imgs;
        if (selectedProduct?.image) return [selectedProduct.image];
        return [bcn];
    })();

    const currentDisplayImg = productImages[activeImageIndex] || productImages[0] || bcn;

    const isLightMode = themeMode === 'light';

    return (
        <div className={`user-page ${isLightMode ? 'user-light-mode' : ''}`}>
            {/* Header đồng bộ chuẩn BCN */}
            <header className="user-header">
                <div className="user-logo">
                    <img src={bcn} alt="Logo BCN" className="logo-img" />
                    <div className="brand-text">
                        <span className="brand-title">BAN CÔNG NGHỆ</span>
                        <span className="brand-sub">Uniform Store & Techwear</span>
                    </div>
                </div>

                <div className="header-right">
                    <button
                        className="theme-toggle-btn user-orders-btn"
                        onClick={() => {
                            fetchUserOrders();
                            setShowOrdersModal(true);
                        }}
                        title="Xem danh sách đơn hàng của bạn"
                    >
                        <ClipboardList size={16} />
                        <span>Đơn Hàng ({userOrders.length})</span>
                    </button>

                    <button
                        className="theme-toggle-btn"
                        onClick={toggleThemeMode}
                        title={`Chế độ hiện tại: ${themeMode === 'auto' ? 'Theo thời gian thực' : themeMode === 'light' ? 'Chế độ Sáng' : 'Chế độ Tối'}`}
                    >
                        {themeMode === 'light' ? <Sun size={16} /> : <Moon size={16} />}
                        <span>Theme: {themeMode === 'auto' ? 'Auto (Giờ)' : themeMode === 'light' ? 'Sáng' : 'Tối'}</span>
                    </button>

                    {userRole === 'admin' && (
                        <Link to="/admin" className="header-admin-link">
                            <Shield size={15} /> Quản lý
                        </Link>
                    )}

                    <div className="user-card">
                        <img
                            src={user.picture?.data?.url || bcn}
                            alt="Avatar"
                            className="user-avatar"
                        />
                        <div className="user-info">
                            <p className="user-name">{user.name}</p>
                            <span className="user-role">
                                {userRole === 'admin' ? 'Quản trị viên' : 'Thành viên'}
                            </span>
                        </div>
                        <button
                            className="logout-button"
                            onClick={handleLogout}
                            title="Đăng xuất"
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Thanh Filter & Search sản phẩm */}
            <section className="filter-bar-container">
                <div className="filter-bar">
                    <div className="search-box">
                        <Search size={18} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm áo polo, hoodie, T-shirt..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button className="clear-search" onClick={() => setSearchQuery("")}>
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    <div className="filter-group">
                        <div className="filter-select-wrap">
                            <Filter size={15} className="select-icon" />
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="filter-select"
                            >
                                <option value="all">Tất cả danh mục</option>
                                {/* Lấy category unique từ products thực tế */}
                                {[...new Set(products.map(p => p.category).filter(Boolean))].map(cat => (
                                    <option key={cat} value={cat}>
                                        {{
                                            polo: 'Áo Polo',
                                            tshirt: 'Áo Thun (T-Shirt)',
                                            hoodie: 'Áo Hoodie',
                                            jacket: 'Áo Khoác',
                                            sportswear: 'Áo Thể Thao',
                                            shorts: 'Quần Short',
                                            jogger: 'Quần Jogger',
                                            cap: 'Mũ / Nón',
                                            tote: 'Túi Tote / Balo',
                                            accessories: 'Phụ Kiện',
                                        }[cat] || cat}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="filter-select-wrap">
                            <select
                                value={priceRange}
                                onChange={(e) => setPriceRange(e.target.value)}
                                className="filter-select"
                            >
                                <option value="all">Mọi mức giá</option>
                                <option value="under300">Dưới 300.000 đ</option>
                                <option value="300to500">300.000 - 500.000 đ</option>
                                <option value="over500">Trên 500.000 đ</option>
                            </select>
                        </div>

                        <div className="filter-select-wrap">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="filter-select"
                            >
                                <option value="all">Tất cả tình trạng</option>
                                <option value="inStock">Còn hàng</option>
                                <option value="outOfStock">Tạm hết</option>
                            </select>
                        </div>
                    </div>

                    <div className="filter-summary">
                        Hiển thị <strong>{filteredProducts.length}</strong> sản phẩm
                    </div>
                </div>
            </section>

            {/* Layout chính: Bên trái là lưới các ô sản phẩm hiện có, bên phải là chi tiết sản phẩm được chọn & order */}
            <main className="user-main-layout">
                {/* CỘT TRÁI: DANH SÁCH CÁC Ô SẢN PHẨM HIỆN CÓ */}
                <div className="products-grid-section">
                    <div className="section-title-wrap">
                        <h2>
                            <Layers size={18} /> Các Sản Phẩm BCN Hiện Có
                        </h2>
                        <span className="live-sync-indicator">
                            <span className="dot"></span> Cập nhật trực tiếp từ Admin
                        </span>
                    </div>

                    {filteredProducts.length === 0 ? (
                        <div className="no-products-found">
                            <ShoppingBag size={48} />
                            <p>Không tìm thấy sản phẩm phù hợp với bộ lọc</p>
                            <button
                                className="btn-reset-filters"
                                onClick={() => {
                                    setSearchQuery("");
                                    setSelectedCategory("all");
                                    setPriceRange("all");
                                    setStatusFilter("all");
                                }}
                            >
                                Đặt lại bộ lọc
                            </button>
                        </div>
                    ) : (
                        <div className="products-grid">
                            {filteredProducts.map((item) => {
                                const isSelected = selectedProduct?.id === item.id;
                                // Lọc ảnh hợp lệ (bỏ giá trị rỗng/null)
                                const validImages = (item.images || []).filter(img => img && img.trim() !== '');
                                const primaryImg = validImages[0] || item.image || bcn;
                                const totalImgs = validImages.length;

                                return (
                                    <div
                                        key={item.id}
                                        className={`product-card ${isSelected ? 'active' : ''} ${!item.inStock ? 'is-out' : ''}`}
                                        onClick={() => setSelectedProduct(item)}
                                    >
                                        {item.badge && (
                                            <span className="product-card-badge">
                                                <Sparkles size={11} /> {item.badge}
                                            </span>
                                        )}
                                        <div className="card-thumb">
                                            <img
                                                src={primaryImg}
                                                alt={item.name}
                                                onError={(e) => { e.target.onerror = null; e.target.src = bcn; }}
                                            />
                                            {!item.inStock && (
                                                <div className="card-out-overlay">Tạm hết hàng</div>
                                            )}
                                            {totalImgs > 1 && (
                                                <span className="card-img-badge">{totalImgs} ảnh</span>
                                            )}
                                        </div>
                                        <div className="card-body">
                                            <span className="card-tag">{item.tag || 'BCN Collection'}</span>
                                            <h3 className="card-title">{item.name}</h3>
                                            <div className="card-price-row">
                                                <span className="card-price">
                                                    {item.price?.toLocaleString('vi-VN')} đ
                                                </span>
                                                {item.oldPrice && (
                                                    <span className="card-old-price">
                                                        {item.oldPrice?.toLocaleString('vi-VN')} đ
                                                    </span>
                                                )}
                                            </div>
                                            <div className="card-footer-info">
                                                <span className={`stock-indicator ${item.inStock ? 'instock' : 'outstock'}`}>
                                                    {item.inStock ? '• Còn hàng' : '• Hết hàng'}
                                                </span>
                                                <span className="card-sizes">
                                                    {(item.sizes || ['S', 'M', 'L']).slice(0, 3).join('/')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* CỘT PHẢI: CHI TIẾT SẢN PHẨM & ĐẶT MUA */}
                {selectedProduct && (
                    <aside className="product-detail-panel">
                        <div className="detail-sticky-wrap">
                            {/* KHU VỰC ẢNH CHÍNH & CAROUSEL NHIỀU ẢNH */}
                            <div className="detail-gallery">
                                <div className="detail-preview-banner">
                                    <img
                                        src={currentDisplayImg}
                                        alt={selectedProduct.name}
                                        className="detail-main-img"
                                        onError={(e) => { e.target.onerror = null; e.target.src = bcn; }}
                                    />
                                    {selectedProduct.badge && (
                                        <div className="preview-badge">{selectedProduct.badge}</div>
                                    )}
                                    {productImages.length > 1 && (
                                        <div className="gallery-counter">
                                            {activeImageIndex + 1} / {productImages.length}
                                        </div>
                                    )}
                                </div>

                                {/* Thanh chọn thumbnail nhiều ảnh */}
                                {productImages.length > 1 && (
                                    <div className="detail-thumbnails-row">
                                        {productImages.map((img, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                className={`thumb-btn ${activeImageIndex === idx ? 'active' : ''}`}
                                                onClick={() => setActiveImageIndex(idx)}
                                            >
                                                <img
                                                    src={img}
                                                    alt={`Góc chụp ${idx + 1}`}
                                                    onError={(e) => {
                                                        e.target.onerror = null;
                                                        e.target.src = bcn;
                                                    }}
                                                />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="pro-section1">
                                <p className="product-tag">{selectedProduct.tag || "BCN Techwear"}</p>
                                <h1 className="product-name">{selectedProduct.name}</h1>
                                <div className="price-container">
                                    <span className="product-price">
                                        {selectedProduct.price?.toLocaleString('vi-VN')} đ
                                    </span>
                                    {selectedProduct.oldPrice && (
                                        <span className="product-old-price">
                                            {selectedProduct.oldPrice?.toLocaleString('vi-VN')} đ
                                        </span>
                                    )}
                                </div>
                                <p className="product-note">Miễn phí vận chuyển nội bộ BCN</p>
                                {selectedProduct.description && (
                                    <p className="product-description-text">{selectedProduct.description}</p>
                                )}
                            </div>

                            <div className="pro-section2">
                                {/* Chọn giới tính */}
                                <div className="pr-gender">
                                    <p className="product-gender">
                                        Giới tính: <span className="gender-value">{gender}</span>
                                    </p>
                                    <div className="product-gender-choice">
                                        {availableGenders.map((g) => (
                                            <button
                                                key={g}
                                                className={`choice choice-gender ${gender === g ? 'selected' : ''}`}
                                                onClick={() => setGender(g)}
                                            >
                                                {g === 'Male' ? 'Nam' : g === 'Female' ? 'Nữ' : g}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Chọn size */}
                                <div className="pr-size">
                                    <p className="product-size">
                                        Kích thước: <span className="size-value">{size}</span>
                                    </p>
                                    <div className="product-size-choice">
                                        {availableSizes.map((sz) => (
                                            <button
                                                key={sz}
                                                className={`choice choice-size ${size === sz ? 'selected' : ''}`}
                                                onClick={() => setSize(sz)}
                                            >
                                                {sz}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Chọn số lượng */}
                                <div className="pr-quantity">
                                    <p className="product-quantity">Số lượng đặt</p>
                                    <div className="product-quantity-choice">
                                        <button
                                            className="choice choice-quantity-btn"
                                            onClick={() => setCount(Math.max(1, count - 1))}
                                        >
                                            -
                                        </button>
                                        <span className="quantity-display">{count}</span>
                                        <button
                                            className="choice choice-quantity-btn"
                                            onClick={() => setCount(Math.min(10, count + 1))}
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>

                                {/* Tổng tiền & nút đặt */}
                                <div className="order-total-summary">
                                    <span>Tạm tính ({count} sản phẩm):</span>
                                    <span className="total-amount">
                                        {((selectedProduct.price || 0) * count).toLocaleString('vi-VN')} đ
                                    </span>
                                </div>

                                <div className="pr-buy">
                                    <button
                                        className="buy-button"
                                        onClick={handlePurchase}
                                        disabled={!selectedProduct.inStock || isSubmitting}
                                    >
                                        {isSubmitting
                                            ? "Đang gửi đơn hàng..."
                                            : !selectedProduct.inStock
                                                ? "Tạm hết hàng"
                                                : "Đặt Mua Ngay"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </aside>
                )}
            </main>

            {/* FOOTER ĐẲNG CẤP BAN CÔNG NGHỆ */}
            <footer className="user-footer">
                <div className="footer-content">
                    <div className="footer-col brand-col">
                        <div className="footer-logo">
                            <img src={bcn} alt="Logo BCN" />
                            <div>
                                <h3>BAN CÔNG NGHỆ</h3>
                                <p>School Life Stories & Techwear Uniform</p>
                            </div>
                        </div>
                        <p className="footer-desc">
                            Hệ thống đồng phục và trang phục sự kiện độc quyền của Ban Công Nghệ. Thiết kế phong cách Techwear trẻ trung, chất liệu bền bỉ và hiện đại.
                        </p>
                    </div>

                    <div className="footer-col">
                        <h4>Liên Kết Nhanh</h4>
                        <ul className="footer-links">
                            <li><a href="#polo" onClick={(e) => { e.preventDefault(); setSelectedCategory("polo"); }}>Áo Polo BCN</a></li>
                            <li><a href="#hoodie" onClick={(e) => { e.preventDefault(); setSelectedCategory("hoodie"); }}>Áo Hoodie Đêm Dev</a></li>
                            <li><a href="#tshirt" onClick={(e) => { e.preventDefault(); setSelectedCategory("tshirt"); }}>T-Shirt Minimalist</a></li>
                            {userRole === 'admin' && (
                                <li><Link to="/admin">Trang Quản Trị Admin</Link></li>
                            )}
                        </ul>
                    </div>

                    <div className="footer-col">
                        <h4>Chính Sách & Hỗ Trợ</h4>
                        <ul className="footer-links">
                            <li><span>• Miễn phí đổi size trong 7 ngày</span></li>
                            <li><span>• Giao nhận nội bộ câu lạc bộ BCN</span></li>
                            <li><span>• Hỗ trợ may in theo số đo thành viên</span></li>
                            <li><span>• Cam kết chất lượng vải cao cấp</span></li>
                        </ul>
                    </div>

                    <div className="footer-col">
                        <h4>Liên Hệ Ban Công Nghệ</h4>
                        <div className="footer-contact-item">
                            <MapPin size={16} /> Phòng Công Nghệ & Sáng Tạo, Toà BCN
                        </div>
                        <div className="footer-contact-item">
                            <Mail size={16} /> bcn.uniform@techclub.edu.vn
                        </div>
                        <div className="footer-contact-item">
                            <Phone size={16} /> Hotline nội bộ: 1900 2026
                        </div>
                    </div>
                </div>

                <div className="footer-bottom">
                    <p>© 2026 Ban Công Nghệ - Uniform Portal. All rights reserved.</p>
                    <p className="footer-credit">Designed with <Heart size={14} className="heart-icon" /> by BCN Dev Team</p>
                </div>
            </footer>

            {/* MODAL LỊCH SỬ ĐƠN HÀNG ĐÃ ĐẶT */}
            {showOrdersModal && (
                <div className="orders-modal-overlay" onClick={() => setShowOrdersModal(false)}>
                    <div className="orders-modal-container" onClick={(e) => e.stopPropagation()}>
                        <div className="orders-modal-header">
                            <div className="modal-title-wrap">
                                <ClipboardList size={22} className="modal-icon" />
                                <div>
                                    <h3>Lịch Sử Đơn Hàng Đã Đặt</h3>
                                    <p>Xem chi tiết từng sản phẩm, giá cả và tổng thanh toán</p>
                                </div>
                            </div>
                            <button className="btn-close-modal" onClick={() => setShowOrdersModal(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="orders-modal-body">
                            {userOrders.length === 0 ? (
                                <div className="orders-empty-state">
                                    <ShoppingBag size={48} className="empty-icon" />
                                    <h4>Bạn chưa có đơn hàng nào</h4>
                                    <p>Hãy chọn sản phẩm bạn yêu thích và bấm "Đặt Hàng Ngay" để lên đơn nhé!</p>
                                </div>
                            ) : (
                                <div className="orders-list">
                                    {userOrders.map((ord) => (
                                        <div key={ord.id || ord.order_code} className="order-history-card">
                                            <div className="order-card-header">
                                                <div className="order-code-badge">
                                                    Mã đơn: <strong>#{ord.order_code || ord.id}</strong>
                                                </div>
                                                <div className="order-time">
                                                    <Clock size={13} />
                                                    <span>{ord.created_at ? new Date(ord.created_at).toLocaleString('vi-VN') : 'Vừa đặt'}</span>
                                                </div>
                                            </div>

                                            <div className="order-card-content">
                                                <div className="order-product-info">
                                                    <h4 className="order-item-title">{ord.product_name}</h4>
                                                    <div className="order-item-variants">
                                                        <span className="variant-pill">Phân loại: <strong>{ord.gender === 'Female' ? 'Nữ' : 'Nam'}</strong></span>
                                                        <span className="variant-pill">Size: <strong>{ord.size}</strong></span>
                                                        <span className="variant-pill">Số lượng: <strong>x{ord.quantity}</strong></span>
                                                    </div>
                                                </div>

                                                <div className="order-pricing-breakdown">
                                                    <div className="price-item-row">
                                                        <span className="price-label">Đơn giá từng món:</span>
                                                        <span className="price-val">{Number(ord.price || 0).toLocaleString('vi-VN')} đ</span>
                                                    </div>
                                                    <div className="price-item-row">
                                                        <span className="price-label">Số lượng đặt:</span>
                                                        <span className="price-val">x {ord.quantity || 1}</span>
                                                    </div>
                                                    <div className="price-item-row total-row">
                                                        <span className="price-label">Tổng thanh toán:</span>
                                                        <span className="price-val total-highlight">
                                                            {Number(ord.total_price || (ord.price * (ord.quantity || 1)) || 0).toLocaleString('vi-VN')} đ
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="order-card-footer">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    {ord.status === 'CANCELLED' ? (
                                                        <span className="order-status-tag status-cancelled">
                                                            <X size={13} /> Đã hủy
                                                        </span>
                                                    ) : (
                                                        <span className="order-status-tag status-success">
                                                            <Check size={13} /> Đã ghi nhận đơn hàng
                                                        </span>
                                                    )}
                                                    <span className="buyer-name-tag">Người đặt: {ord.name || user?.name || 'Khách hàng BCN'}</span>
                                                </div>

                                                {ord.status !== 'CANCELLED' && (
                                                    <button
                                                        type="button"
                                                        className="btn-cancel-order"
                                                        onClick={() => handleCancelOrder(ord)}
                                                        title="Hủy đơn hàng này"
                                                    >
                                                        <X size={13} /> Hủy đơn hàng
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

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

export default User;