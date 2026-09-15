import './Login.css';
import zaloIcon from '../assets/zalo-icon.png';
import { useState, useEffect } from 'react';

const loginResultStorageKey = 'zalo_login_result';

function Login() {
    const [time, setTime] = useState(new Date());

    // Đồng hồ chạy
    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const channel = 'BroadcastChannel' in window
            ? new BroadcastChannel('zalo_login')
            : null;

        const handleLoginResult = (result) => {
            if (result?.success) {
                alert(`Chào mừng ${result.user.name}`);
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

            handleLoginResult(JSON.parse(event.newValue));
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

    useEffect(() => {
        const handleZaloMessage = (event) => {
            // Chỉ nhận message từ chính domain của mình
            if (event.origin !== window.location.origin) {
                return;
            }

            if (event.data?.type !== 'ZALO_LOGIN_SUCCESS') {
                return;
            }

            const userData = event.data.data;

            console.log('Dữ liệu User nhận được:', userData);

            // Lưu thông tin user
            localStorage.setItem(
                'zalo_user',
                JSON.stringify(userData.user)
            );

            // Chuyển sang trang User
            window.location.href = '/user';
        };

        window.addEventListener('message', handleZaloMessage);

        return () => {
            window.removeEventListener('message', handleZaloMessage);
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

        loginPopup.location.href =
            `${import.meta.env.VITE_API_URL}/dev/auth`;
    };

    const hour = time.getHours();

    let welcomeDay = 0;
    if (hour >= 6 && hour < 12) welcomeDay = 1;
    else if (hour >= 12 && hour < 18) welcomeDay = 2;
    else if (hour >= 18 && hour <= 23) welcomeDay = 3;
    else if (hour >= 0 && hour < 6) welcomeDay = 4;

    useEffect(() => {
        const handleZaloLogin = (event) => {
            console.log("📩 Nhận message:", event.data);
            console.log("📩 Origin:", event.origin);

            if (event.data?.type === "ZALO_LOGIN_SUCCESS") {
                const user = event.data.user;

                console.log("✅ User:", user);

                localStorage.setItem(
                    "zalo_user",
                    JSON.stringify(user)
                );

                console.log("➡️ Đang chuyển sang /user");

                window.location.href = "/user";
            }
        };

        window.addEventListener("message", handleZaloLogin);

        return () => {
            window.removeEventListener("message", handleZaloLogin);
        };
    }, []);

    return (
        <div className="container">
            <div className="conReview">
                <div className="demo">
                    <div className="slideNews"></div>
                    <div className="prev">{'<'}</div>
                    <div className="next">{'>'}</div>
                </div>

                <div className="slider">
                    <div className="line"></div>
                    <div className="slide">
                        <div className="img1"></div>
                        <div className="img2"></div>
                        <div className="img3"></div>
                    </div>
                </div>
            </div>

            <div className="conLogin">
                <div className="logo">
                    <img src="../assets/bcn.png" alt="" className='logo-bcn' />
                    Ban Công Nghệ
                </div>
                <div className="decor-corner"></div>
                <div className="conLogin-ch">
                    <div className='welcome'>
                        Welcome
                        <span className='welcomeText'>{
                            (welcomeDay == 1) ? 'Good Morning' :
                                (welcomeDay == 2) ? 'Good Afternoon' :
                                    (welcomeDay == 3) ? 'Good Evening' :
                                        (welcomeDay == 4) ? 'Good Night' : ('')
                        }</span>
                    </div>
                    <div className="username">
                        <p className="usernameField">Tên đăng nhập</p>
                        <input type="text" name="username" id="username" placeholder='Tên đăng nhập' />
                    </div>
                    <div className="password">
                        <p className="passwordField">Mật khẩu</p>
                        <input type="password" name="password" id="password" placeholder='Mật khẩu' />
                    </div>
                    <div className="btnLogin">
                        <button className='btnLoginTag'>Đăng nhập</button>
                    </div>
                    <div className="zaloLogin">
                        <button className='zaloLoginTag' onClick={handleZaloLogin}>
                            <img src={zaloIcon} alt="" className='zalo-icon' />
                            Đăng nhập bằng Zalo
                        </button>
                    </div>
                    <a className='register' href=''>
                        Chưa có tài khoản? Đăng ký ngay
                    </a>
                </div>
            </div>
        </div>
    );
}

export default Login