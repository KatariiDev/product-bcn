import './Login.css';
import zaloIcon from '../assets/zalo-icon.png';
import bcnLogo from '../assets/bcn.png';
import { useState, useEffect } from 'react';
import { getStoredProducts, STORAGE_KEY_PRODUCTS } from '../../admin/Admin';
import { supabaseApi } from '../supabaseClient';
import { ChevronLeft, ChevronRight, Sparkles, Tag, ShieldCheck, ShoppingBag, Sun, Moon, Eye, EyeOff } from 'lucide-react';

const loginResultStorageKey = 'zalo_login_result';
const verifierStorageKey = (state) => `zalo_code_verifier_${state}`;

function Login() {
    const [time, setTime] = useState(new Date());
    const [products, setProducts] = useState([]);
    const [productsLoading, setProductsLoading] = useState(true);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [loginUsername, setLoginUsername] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);
    const [showLoginPassword, setShowLoginPassword] = useState(false);

    // Đồng hồ chạy & kiểm tra lỗi auth_error
    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        const authErr = sessionStorage.getItem('auth_error');
        if (authErr) {
            setLoginError(authErr);
            sessionStorage.removeItem('auth_error');
        }
        return () => clearInterval(timer);
    }, []);

    // Load danh sách sản phẩm: hiện localStorage ngay, thumbnail chờ Supabase xác nhận
    useEffect(() => {
        const MAX_PRODUCTS = 5;

        const loadProducts = async () => {
            // Hiện localStorage ngay lập tức — card showcase không bị trống
            const localList = getStoredProducts();
            if (localList && localList.length > 0) {
                setProducts(localList.slice(0, MAX_PRODUCTS));
            }

            // Fetch Supabase — cập nhật chính xác, tửnhide thumbnail đến khi xong
            setProductsLoading(true);
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
                        hasDiscountExpiry: p.has_discount_expiry === true || p.hasDiscountExpiry === true,
                        discountExpiresAt: p.discount_expires_at || p.discountExpiresAt || '',
                        hasStockExpiry: p.has_stock_expiry === true || p.hasStockExpiry === true,
                        stockExpiresAt: p.stock_expires_at || p.stockExpiresAt || '',
                        sizes: Array.isArray(p.sizes) ? p.sizes : ['S', 'M', 'L', 'XL'],
                        inStock: p.in_stock !== false,
                        badge: p.badge || '',
                        image: p.image && p.image.trim() !== '' ? p.image : bcnLogo,
                        images: Array.isArray(p.images) ? p.images.filter(img => img && img.trim() !== '') : [],
                        description: p.description || ''
                    }));
                    setProducts(formatted.slice(0, MAX_PRODUCTS));
                    setCurrentSlide(prev => Math.min(prev, Math.min(formatted.length, MAX_PRODUCTS) - 1));
                    // Cập nhật localStorage — lần reload sau sẽ dùng data đúng, không flash
                    try { localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(remoteProds)); } catch (_) {}
                }
            } catch (err) {
                console.warn('Login: lỗi fetch sản phẩm Supabase:', err);
            } finally {
                setProductsLoading(false);
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
                    localStorage.setItem('zalo_user', JSON.stringify(data.user));

                    window.history.replaceState({}, document.title, window.location.pathname);
                    // Nếu là popup trên PC (có window.opener): đóng popup để tab cha reload sang /user
                    if (window.opener && window.opener !== window) {
                        window.close();
                    } else {
                        // Trên điện thoại (redirect cùng tab): chuyển thẳng sang /user
                        window.location.href = '/user';
                    }
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

    const isMobileDevice = () => {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
    };

    const handleZaloLogin = () => {
        const authUrl = `${import.meta.env.VITE_API_URL}/dev/auth`;
        const forceRelogin = localStorage.getItem('zalo_force_relogin');

        // Trên điện thoại: Không dùng popup (tránh bị mở tab mới và để lại tab cũ mồ côi)
        // Mà điều hướng trực tiếp (deeplink / full redirect) sang Zalo để mở app / xác thực
        if (isMobileDevice()) {
            if (forceRelogin) {
                localStorage.removeItem('zalo_force_relogin');
            }
            window.location.href = authUrl;
            return;
        }

        // Trên máy tính (PC / Desktop): Giữ nguyên popup kích thước nhỏ gọn
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
            console.error('Trình duyệt đã chặn tab đăng nhập Zalo, chuyển sang điều hướng trực tiếp');
            window.location.href = authUrl;
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

        if (forceRelogin) {
            // Vừa logout: cần xóa session Zalo trong popup trước rồi mới đăng nhập
            localStorage.removeItem('zalo_force_relogin');
            loginPopup.location.href = 'https://id.zalo.me/account/logout';
            setTimeout(() => {
                try {
                    if (!loginPopup.closed) {
                        loginPopup.location.href = authUrl;
                    }
                } catch (e) {
                    try { loginPopup.location.href = authUrl; } catch (_) {}
                }
            }, 2500);
        } else {
            loginPopup.location.href = authUrl;
        }
    };

    // Đăng nhập nội bộ bằng username + password
    const handleInternalLogin = async (e) => {
        e.preventDefault();
        if (!loginUsername.trim() || !loginPassword) {
            setLoginError('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu!');
            return;
        }
        setLoginLoading(true);
        setLoginError('');
        try {
            const result = await supabaseApi.loginWithAccount(loginUsername, loginPassword);
            if (result.success) {
                const acc = result.account;
                // Lưu thông tin người dùng vào localStorage
                const userObj = {
                    id: acc.username,
                    zalo_id: acc.username,
                    name: acc.display_name || acc.username,
                    avatar: '',
                    role: acc.role,
                    login_type: 'internal'
                };
                localStorage.setItem('zalo_user', JSON.stringify(userObj));
                // Redirect theo role
                if (acc.role === 'admin') {
                    window.location.href = '/admin';
                } else {
                    window.location.href = '/user';
                }
            } else {
                setLoginError(result.error || 'Đăng nhập thất bại!');
            }
        } catch (err) {
            setLoginError('Lỗi kết nối. Vui lòng thử lại!');
        } finally {
            setLoginLoading(false);
        }
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

    // Chế độ theme ở màn hình login luôn tự động thay đổi theo thời gian thực trong ngày
    // (Sáng: theme-morning, Chiều: theme-afternoon, Tối: theme-evening, Đêm: theme-night)
    const effectiveThemeClass = timeTheme;

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

                {/* Hero Showcase Card - hiện ngay từ localStorage */}
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
                                    {activeProd.oldPrice && (!activeProd.hasDiscountExpiry || !activeProd.discountExpiresAt || new Date(activeProd.discountExpiresAt).getTime() > Date.now()) && (
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

                    <form className="login-form-inner" onSubmit={handleInternalLogin}>
                        <div className="input-group">
                            <label className="input-label" htmlFor="username">Tên đăng nhập</label>
                            <div className="input-wrapper">
                                <input
                                    type="text"
                                    name="username"
                                    id="username"
                                    placeholder='Nhập username hoặc mã thành viên'
                                    autoComplete="username"
                                    value={loginUsername}
                                    onChange={e => { setLoginUsername(e.target.value); setLoginError(''); }}
                                />
                            </div>
                        </div>

                        <div className="input-group">
                            <div className="input-label-row">
                                <label className="input-label" htmlFor="password">Mật khẩu</label>
                                <a href="#" className="forgot-link">Quên mật khẩu?</a>
                            </div>
                            <div className="input-wrapper" style={{ position: 'relative' }}>
                                <input
                                    type={showLoginPassword ? 'text' : 'password'}
                                    name="password"
                                    id="password"
                                    placeholder='••••••••••••'
                                    autoComplete="current-password"
                                    value={loginPassword}
                                    onChange={e => { setLoginPassword(e.target.value); setLoginError(''); }}
                                    style={{ paddingRight: '42px' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowLoginPassword(p => !p)}
                                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', padding: 0 }}
                                    title={showLoginPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                                >
                                    {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        {loginError && (
                            <div style={{ color: '#f87171', fontSize: '12.5px', padding: '8px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', marginTop: '-4px' }}>
                                ⚠️ {loginError}
                            </div>
                        )}

                        <div className="btnLogin">
                            <button className='btnLoginTag' type="submit" disabled={loginLoading}>
                                <span>{loginLoading ? 'Đang xác nhận...' : 'Xác nhận đăng nhập'}</span>
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