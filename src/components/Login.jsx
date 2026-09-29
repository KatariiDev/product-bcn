import './Login.css';
import zaloIcon from '../assets/zalo-icon.png';
import bcnLogo from '../assets/bcn.png';
import { useState, useEffect } from 'react';
import { getStoredProducts } from '../../admin/Admin';
import { supabaseApi } from '../supabaseClient';
import { ChevronLeft, ChevronRight, Sparkles, Tag, ShieldCheck, ShoppingBag, Sun, Moon } from 'lucide-react';

const loginResultStorageKey = 'zalo_login_result';
const verifierStorageKey = (state) => `zalo_code_verifier_${state}`;

function Login() {
    const [time, setTime] = useState(new Date());
    const [products, setProducts] = useState([]);
    const [currentSlide, setCurrentSlide] = useState(0);

    // Đồng hồ chạy
    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Load danh sách sản phẩm: ưu tiên Supabase, fallback localStorage
    useEffect(() => {
        const MAX_PRODUCTS = 5;

        const loadProducts = async () => {
            // Fallback: hiện localStorage ngay lập tức
            const localList = getStoredProducts();
            if (localList && localList.length > 0) {
                setProducts(localList.slice(0, MAX_PRODUCTS));
            }

            // Fetch từ Supabase để đồng bộ
            try {
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
                        inStock: p.in_stock !== false,
                        badge: p.badge || '',
                        image: p.image && p.image.trim() !== '' ? p.image : bcnLogo,
                        images: Array.isArray(p.images) ? p.images.filter(img => img && img.trim() !== '') : [],
                        description: p.description || ''
                    }));
                    setProducts(formatted.slice(0, MAX_PRODUCTS));
                    // Reset slide nếu vượt giới hạn
                    setCurrentSlide(prev => Math.min(prev, Math.min(formatted.length, MAX_PRODUCTS) - 1));
                }
            } catch (err) {
                console.warn('Login: lỗi fetch sản phẩm Supabase:', err);
            }
        };

        loadProducts();
    }, []);

    // Tự động chuyển slide
    useEffect(() => {
        if (products.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % products.length);
        }, 4500);
        return () => clearInterval(interval);
    }, [products]);

    const handlePrevSlide = () => {
        if (products.length === 0) return;
        setCurrentSlide((prev) => (prev === 0 ? products.length - 1 : prev - 1));
    };

    const handleNextSlide = () => {
        if (products.length === 0) return;
        setCurrentSlide((prev) => (prev + 1) % products.length);
    };

    useEffect(() => {
        const channel = 'BroadcastChannel' in window
            ? new BroadcastChannel('zalo_login')
            : null;

        const handleLoginResult = (result) => {
            if (result?.success && result?.user) {
                console.log('✅ Đăng nhập Zalo thành công:', result.user);
                localStorage.setItem('zalo_user', JSON.stringify(result.user));
                window.location.href = '/user';
            } else if (result?.error) {
                console.error('Lỗi xác thực Zalo:', result.error);
            }
        };

        const handleChannelMessage = (event) => {
            handleLoginResult(event.data);
        };

        const handleStorageMessage = (event) => {
            if (event.key !== loginResultStorageKey || !event.newValue) {
                return;
            }

            try {
                handleLoginResult(JSON.parse(event.newValue));
            } catch (err) {
                console.error("Lỗi parse storage:", err);
            }
        };

        channel?.addEventListener('message', handleChannelMessage);
        window.addEventListener('storage', handleStorageMessage);

        const queryParams = new URLSearchParams(window.location.search);
        const code = queryParams.get('code');
        const error = queryParams.get('error');
        const state = queryParams.get('state');
        const codeVerifier = state
            ? localStorage.getItem(verifierStorageKey(state))
            : null;

        if (error) {
            console.error('Zalo từ chối đăng nhập:', error);
        } else if (code && codeVerifier) {
            const apiUrl = import.meta.env.VITE_API_URL;

            fetch(`${apiUrl}/dev/login?${new URLSearchParams({
                code,
                code_verifier: codeVerifier
            })}`)
                .then(async (response) => {
                    const data = await response.json();

                    if (!response.ok) {
                        throw new Error(data.error || 'Đăng nhập Zalo thất bại');
                    }

                    return data;
                })
                .then((data) => {
                    const result = { success: true, user: data.user };
                    localStorage.removeItem(verifierStorageKey(state));
                    channel?.postMessage(result);
                    localStorage.setItem(loginResultStorageKey, JSON.stringify(result));

                    window.history.replaceState({}, document.title, window.location.pathname);
                    window.close();
                })
                .catch((callbackError) => {
                    const result = { success: false, error: callbackError.message };
                    channel?.postMessage(result);
                    localStorage.setItem(loginResultStorageKey, JSON.stringify(result));
                    localStorage.removeItem(verifierStorageKey(state));
                    console.error('Lỗi xác thực Zalo:', callbackError);
                });
        }

        return () => {
            channel?.removeEventListener('message', handleChannelMessage);
            channel?.close();
            window.removeEventListener('storage', handleStorageMessage);
        };
    }, []);

    const handleZaloLogin = () => {
        const popupWidth = 480;
        const popupHeight = 720;

        const popupLeft =
            window.screenX +
            (window.outerWidth - popupWidth) / 2;

        const popupTop =
            window.screenY +
            (window.outerHeight - popupHeight) / 2;

        const loginPopup = window.open(
            '',
            'zalo_oauth_popup',
            `width=${popupWidth},height=${popupHeight},left=${popupLeft},top=${popupTop},resizable=yes,scrollbars=yes`
        );

        if (!loginPopup) {
            console.error('Trình duyệt đã chặn tab đăng nhập Zalo');
            return;
        }

        let timer = setInterval(() => {
            if (loginPopup.closed) {
                clearInterval(timer);
                try {
                    const saved = localStorage.getItem('zalo_user');
                    if (saved) {
                        window.location.href = '/user';
                    }
                } catch (e) {
                    console.error(e);
                }
            }
        }, 500);

        loginPopup.location.href =
            `${import.meta.env.VITE_API_URL}/dev/auth`;
    };

    const hour = time.getHours();

    let welcomeDay = 0;
    let timeTheme = 'theme-night'; // 'theme-morning' | 'theme-afternoon' | 'theme-evening' | 'theme-night'
    if (hour >= 6 && hour < 12) {
        welcomeDay = 1;
        timeTheme = 'theme-morning';
    } else if (hour >= 12 && hour < 18) {
        welcomeDay = 2;
        timeTheme = 'theme-afternoon';
    } else if (hour >= 18 && hour <= 22) {
        welcomeDay = 3;
        timeTheme = 'theme-evening';
    } else {
        welcomeDay = 4;
        timeTheme = 'theme-night';
    }

    // Kiểm tra nếu người dùng đã tùy chỉnh chế độ sáng/tối trong Admin/User
    const [savedThemeMode, setSavedThemeMode] = useState(() => localStorage.getItem('app_theme_mode') || 'auto');

    useEffect(() => {
        const handleThemeChange = () => {
            setSavedThemeMode(localStorage.getItem('app_theme_mode') || 'auto');
        };
        window.addEventListener('storage', handleThemeChange);
        window.addEventListener('theme_mode_changed', handleThemeChange);
        return () => {
            window.removeEventListener('storage', handleThemeChange);
            window.removeEventListener('theme_mode_changed', handleThemeChange);
        };
    }, []);

    const effectiveThemeClass = savedThemeMode === 'light'
        ? 'mode-light theme-morning'
        : savedThemeMode === 'dark'
            ? 'mode-dark theme-night'
            : timeTheme;

    useEffect(() => {
        const handleZaloMessage = (event) => {
            console.log("📩 Nhận message từ popup:", event.data);

            if (event.data?.type === "ZALO_LOGIN_SUCCESS") {
                const user = event.data.user || event.data.data?.user;
                if (user) {
                    console.log("✅ User nhận được:", user);
                    localStorage.setItem("zalo_user", JSON.stringify(user));
                    console.log("➡️ Đang chuyển hướng sang /user...");
                    window.location.href = "/user";
                }
            }
        };

        window.addEventListener("message", handleZaloMessage);

        return () => {
            window.removeEventListener("message", handleZaloMessage);
        };
    }, []);

    const activeProd = products[currentSlide] || null;

    return (
        <div className={`login-page-root ${effectiveThemeClass}`}>
            {/* CỘT BÊN TRÁI: SHOWCASE SẢN PHẨM HIỆN ĐẠI */}
            <div className="conReview">
                <div className="showcase-glow"></div>

                {/* Header thương hiệu bên trái */}
                <div className="showcase-header">
                    <div className="showcase-tag">
                        <Sparkles size={16} className="sparkle-icon" />
                        <span>Bộ sưu tập đồng phục Ban Công Nghệ 2026</span>
                    </div>
                    <h2 className="showcase-title">Techwear For Real Builders</h2>
                    <p className="showcase-subtitle">
                        Trải nghiệm các mẫu áo đồng phục chất lượng cao, thiết kế độc bản cùng phong cách công nghệ trẻ trung.
                    </p>
                </div>

                {/* Hero Showcase Card */}
                {activeProd && (
                    <div className="showcase-card">
                        <div className="showcase-media-box">
                            <img
                                src={activeProd.image || (activeProd.images && activeProd.images[0]) || bcnLogo}
                                alt={activeProd.name}
                                className="showcase-img"
                                onError={(e) => { e.target.onerror = null; e.target.src = bcnLogo; }}
                            />
                            {activeProd.tag && (
                                <span className="showcase-badge">
                                    <Tag size={12} /> {activeProd.tag}
                                </span>
                            )}
                            <div className="showcase-stock-tag">
                                <ShieldCheck size={14} /> Chính hãng BCN
                            </div>
                        </div>

                        <div className="showcase-info">
                            <div className="showcase-info-top">
                                <span className="showcase-category">{activeProd.category?.toUpperCase() || 'COLLECTION'}</span>
                                <div className="showcase-price-wrap">
                                    <span className="showcase-price">
                                        {Number(activeProd.price || 0).toLocaleString('vi-VN')} đ
                                    </span>
                                    {activeProd.oldPrice && (
                                        <span className="showcase-old-price">
                                            {Number(activeProd.oldPrice).toLocaleString('vi-VN')} đ
                                        </span>
                                    )}
                                </div>
                            </div>
                            <h3 className="showcase-product-name">{activeProd.name}</h3>
                            <p className="showcase-desc">{activeProd.description || 'Chất vải cao cấp, thoáng mát, thiết kế năng động dành cho ban công nghệ.'}</p>

                            <div className="showcase-specs">
                                <div className="spec-item">
                                    <span className="spec-label">Sizes:</span>
                                    <span className="spec-value">
                                        {Array.isArray(activeProd.sizes) ? activeProd.sizes.join(', ') : (activeProd.sizes || 'S, M, L, XL')}
                                    </span>
                                </div>
                                <div className="spec-item">
                                    <span className="spec-label">Form:</span>
                                    <span className="spec-value">Regular Fit</span>
                                </div>
                            </div>
                        </div>

                        {/* Navigation Buttons */}
                        {products.length > 1 && (
                            <>
                                <button className="showcase-nav-btn prev" onClick={handlePrevSlide} title="Xem mẫu trước">
                                    <ChevronLeft size={22} />
                                </button>
                                <button className="showcase-nav-btn next" onClick={handleNextSlide} title="Xem mẫu tiếp theo">
                                    <ChevronRight size={22} />
                                </button>
                            </>
                        )}
                    </div>
                )}

                {/* Thumbnails & Slide Indicators */}
                {products.length > 1 && (
                    <div className="showcase-thumbnails">
                        {products.map((p, idx) => (
                            <button
                                key={p.id || idx}
                                className={`thumb-btn ${idx === currentSlide ? 'active' : ''}`}
                                onClick={() => setCurrentSlide(idx)}
                            >
                                <img
                                        src={p.image || (p.images && p.images[0]) || bcnLogo}
                                        alt={p.name}
                                        onError={(e) => { e.target.onerror = null; e.target.src = bcnLogo; }}
                                    />
                                <span className="thumb-indicator"></span>
                            </button>
                        ))}
                    </div>
                )}

                <div className="showcase-footer">
                    <span>Đăng nhập để đặt hàng & chọn kích thước chuẩn của bạn</span>
                </div>
            </div>

            {/* CỘT BÊN PHẢI: FORM ĐĂNG NHẬP ĐỒNG BỘ HIỆN ĐẠI */}
            <div className="conLogin">
                <div className="login-backdrop-glow"></div>

                <div className="login-top-bar">
                    <div className="logo">
                        <img src={bcnLogo} alt="BCN Logo" className='logo-bcn' />
                        <span>Ban Công Nghệ</span>
                    </div>
                    <div className="system-pill">
                        <span className="live-dot"></span>
                        Portal v2.6
                    </div>
                </div>

                <div className="conLogin-ch">
                    <div className='welcome'>
                        <span className='welcomeDayGreeting'>
                            {(welcomeDay == 1) ? '🌅 Good Morning' :
                                (welcomeDay == 2) ? '☀️ Good Afternoon' :
                                    (welcomeDay == 3) ? '🌆 Good Evening' :
                                        (welcomeDay == 4) ? '🌙 Good Night' : '👋 Welcome Back'}
                        </span>
                        <h1 className="welcomeTitle">Đăng nhập tài khoản</h1>
                        <p className='welcomeText'>
                            Chào mừng bạn trở lại! Vui lòng xác thực tài khoản để truy cập hệ thống đặt áo BCN.
                        </p>
                    </div>

                    {/* Quick login bằng Zalo (Ưu tiên) */}
                    <div className="zaloLoginSection">
                        <button className='zaloLoginTag' onClick={handleZaloLogin} type="button">
                            <img src={zaloIcon} alt="Zalo" className='zalo-icon' />
                            <span>Đăng nhập nhanh bằng Zalo</span>
                        </button>
                    </div>

                    <div className="login-divider">
                        <span>hoặc đăng nhập nội bộ</span>
                    </div>

                    <form className="login-form-inner" onSubmit={(e) => e.preventDefault()}>
                        <div className="input-group">
                            <label className="input-label" htmlFor="username">Tên đăng nhập</label>
                            <div className="input-wrapper">
                                <input
                                    type="text"
                                    name="username"
                                    id="username"
                                    placeholder='Nhập username hoặc mã thành viên'
                                    autoComplete="username"
                                />
                            </div>
                        </div>

                        <div className="input-group">
                            <div className="input-label-row">
                                <label className="input-label" htmlFor="password">Mật khẩu</label>
                                <a href="#" className="forgot-link">Quên mật khẩu?</a>
                            </div>
                            <div className="input-wrapper">
                                <input
                                    type="password"
                                    name="password"
                                    id="password"
                                    placeholder='••••••••••••'
                                    autoComplete="current-password"
                                />
                            </div>
                        </div>

                        <div className="btnLogin">
                            <button className='btnLoginTag' type="submit">
                                <span>Xác nhận đăng nhập</span>
                            </button>
                        </div>
                    </form>

                    <div className="register-row">
                        <span>Chưa có tài khoản?</span>
                        <a className='register' href='#'>Đăng ký thành viên</a>
                    </div>
                </div>

                <div className="login-copyright">
                    © 2026 Ban Công Nghệ • Security Verified
                </div>
            </div>
        </div>
    );
}

export default Login;