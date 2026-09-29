import { useEffect, useState } from "react";
import "./User.css";
import { LogOut, Filter, Search, ShoppingBag, Check, Shield, Layers, ChevronRight, ChevronLeft, X, Sparkles, Phone, Mail, MapPin, Heart, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import bcn from '../src/assets/bcn.png';
import { getStoredProducts, STORAGE_KEY_PRODUCTS } from '../admin/Admin';

function User() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

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

    // Lấy thông tin user
    useEffect(() => {
        try {
            const savedUser = localStorage.getItem("zalo_user");
            if (savedUser) {
                const userData = JSON.parse(savedUser);
                setUser(userData);
            }
        } catch (error) {
            console.error("Lỗi đọc thông tin user:", error);
        } finally {
            setLoading(false);
        }
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

    // Kiểm tra trạng thái thanh toán từ PayOS redirect về (payment=success hoặc cancel)
    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search);
        const paymentStatus = queryParams.get("payment") || queryParams.get("status");
        const orderCode = queryParams.get("orderCode");

        if (paymentStatus === "success" || paymentStatus === "PAID") {
            alert(`🎉 Thanh toán đơn hàng #${orderCode || ''} thành công qua PayOS! Cảm ơn bạn.`);
            window.history.replaceState({}, document.title, window.location.pathname);
        } else if (paymentStatus === "cancel" || paymentStatus === "CANCELLED") {
            alert(`Đơn hàng #${orderCode || ''} đã bị huỷ thanh toán.`);
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []);

    const handleLogout = async () => {
        try {
            const apiUrl = import.meta.env.VITE_API_URL;
            if (apiUrl) {
                // Gọi API backend huỷ session đăng nhập
                await fetch(`${apiUrl}/api/logout`, {
                    method: "POST",
                    credentials: "include"
                }).catch(() => {});
            }
        } catch (e) {
            console.error("Lỗi đăng xuất server:", e);
        }

        // Xóa toàn bộ dữ liệu lưu trữ phía client
        localStorage.removeItem("zalo_user");
        localStorage.removeItem("zalo_login_result");
        sessionStorage.clear();

        // Mở popup đăng xuất tài khoản Zalo trên trình duyệt nếu có thể
        try {
            const logoutPopup = window.open("https://id.zalo.me/account/logout", "_blank", "width=100,height=100,left=-1000,top=-1000");
            setTimeout(() => {
                if (logoutPopup && !logoutPopup.closed) {
                    logoutPopup.close();
                }
                window.location.href = "/";
            }, 600);
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
            alert("Sản phẩm hiện đang tạm hết hàng!");
            return;
        }

        if (!gender || gender === "...") {
            alert("Vui lòng chọn giới tính");
            return;
        }

        if (!size || size === "...") {
            alert("Vui lòng chọn size");
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

        console.log("Đang tạo link thanh toán PayOS:", orderData);

        try {
            const apiUrl = import.meta.env.VITE_API_URL;
            let checkoutUrl = null;

            if (apiUrl) {
                // Ưu tiên gọi API backend PayOS
                const response = await fetch(`${apiUrl}/api/create-payment-link`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(orderData)
                }).catch(() => null);

                if (response && response.ok) {
                    const data = await response.json();
                    checkoutUrl = data.checkoutUrl || data.data?.checkoutUrl;
                }
            }

            // Nếu Backend trả về link checkout của PayOS -> Chuyển hướng sang PayOS
            if (checkoutUrl) {
                window.location.href = checkoutUrl;
                return;
            }

            // Nếu Backend chưa có PayOS hoặc đang cấu hình, thông báo và hỗ trợ link PayOS demo
            alert(`Đang chuyển hướng tới cổng thanh toán PayOS cho đơn hàng #${orderCode} (${totalAmount.toLocaleString('vi-VN')} đ)...`);
            
            // Giả lập chuyển hướng tới PayOS hoặc lưu đơn hàng
            setOrderSuccess(orderData);
        } catch (error) {
            console.error("Lỗi tạo thanh toán PayOS:", error);
            alert("Có lỗi khi kết nối với cổng thanh toán PayOS. Vui lòng thử lại!");
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

    // Danh sách ảnh của sản phẩm được chọn
    const productImages = (selectedProduct?.images && selectedProduct.images.length > 0)
        ? selectedProduct.images
        : [selectedProduct?.image || bcn];

    const currentDisplayImg = productImages[activeImageIndex] || productImages[0] || bcn;

    return (
        <div className="user-page">
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
                    <Link to="/admin" className="header-admin-link">
                        <Shield size={15} /> Quản Trị Admin
                    </Link>

                    <div className="user-card">
                        <img
                            src={user.picture?.data?.url || bcn}
                            alt="Avatar"
                            className="user-avatar"
                        />
                        <div className="user-info">
                            <p className="user-name">{user.name}</p>
                            <span className="user-role">Thành viên BCN</span>
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
                                <option value="polo">Áo Polo</option>
                                <option value="tshirt">Áo Thun (T-Shirt)</option>
                                <option value="hoodie">Áo Hoodie</option>
                                <option value="jacket">Áo Khoác</option>
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
                                const primaryImg = (item.images && item.images[0]) || item.image || bcn;
                                const totalImgs = item.images ? item.images.length : 1;

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
                                            <img src={primaryImg} alt={item.name} />
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
                                                <img src={img} alt={`Góc chụp ${idx + 1}`} />
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
                            <li><Link to="/admin">Trang Quản Trị Admin</Link></li>
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
        </div>
    );
}

export default User;