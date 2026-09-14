import './Login.css';
import zaloIcon from '../assets/zalo-icon.png';
import { useState, useEffect } from 'react';

// ================= HÀM HỖ TRỢ PKCE CHO ZALO =================
function generateCodeVerifier(length = 50) {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let result = '';
    const randomValues = new Uint8Array(length);
    crypto.getRandomValues(randomValues);
    for (let i = 0; i < length; i++) {
        result += charset[randomValues[i] % charset.length];
    }
    return result;
}

async function generateCodeChallenge(verifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}
// =============================================================

function Login() {
    const [time, setTime] = useState(new Date());

    // Đồng hồ chạy
    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // BẮT SỰ KIỆN: Khi Zalo redirect ngược lại trang này kèm param ?code=...
    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search);
        const code = queryParams.get('code');
        const codeVerifier = sessionStorage.getItem('code_verifier');

        console.log("Code từ Zalo:", codeVerifier);

        if (code && codeVerifier) {
            console.log("Đã nhận code từ Zalo, gửi sang Backend xác thực...");

            // Gọi Backend để đổi token
            fetch(`https://taile-home.tailb889f1.ts.net/dev/login?code=${code}&code_verifier=${codeVerifier}`)
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        console.log("Đăng nhập thành công! Thông tin user:", data.user);

                        // Dọn dẹp lưu trữ tạm và xoá params rác trên thanh URL
                        sessionStorage.removeItem('code_verifier');
                        window.history.replaceState({}, document.title, window.location.pathname);

                        // Lưu token nếu cần (ví dụ localStorage)
                        // localStorage.setItem('token', data.tokens.access_token);

                        alert(`Chào mừng ${data.user.name}`);
                        // Nếu dùng React Router: navigate('/home');
                    } else {
                        console.error("Lỗi đăng nhập:", data.error);
                    }
                })
                .catch(err => console.error("Lỗi kết nối Backend:", err));
        }
    }, []);
    const handleZaloLogin = async () => {

        try {
            const ZALO_APP_ID = import.meta.env.VITE_ZALO_APP_ID;

            // Redirect URL chính là trang web hiện tại của bạn
            const redirectUri = import.meta.env.VITE_ZALO_REDIRECT_URI;

            // 1. Tạo và lưu code_verifier
            const verifier = generateCodeVerifier(50);

            sessionStorage.setItem(
                'code_verifier',
                verifier
            );

            // 2. Hash SHA-256 ra code_challenge
            const challenge = await generateCodeChallenge(verifier);

            // 3. Gắn các tham số và chuyển hướng tới Zalo
            const authUrl = `https://oauth.zaloapp.com/v4/permission?app_id=${ZALO_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&code_challenge=${challenge}&state=login_zalo`;

            console.log("APP ID:", ZALO_APP_ID);
            console.log("Redirect URI:", redirectUri);
            console.log("Verifier:", verifier);
            console.log("Challenge:", challenge);
            console.log("Auth URL:", authUrl);

            window.location.href = authUrl;
        } catch (error) {
            console.error("Lỗi tạo link Zalo:", error);
        }
    }

    // XỬ LÝ NHẤN NÚT ĐĂNG NHẬP ZALO
    // const handleZaloLogin = async () => {
    //     try {
    //         // Thay YOUR_ZALO_APP_ID bằng ID App trên trang Zalo Developer của bạn

    //         function Login() {
    //             const [time, setTime] = useState(new Date());

    //             useEffect(() => {
    //                 const timer = setInterval(() => setTime(new Date()), 1000);
    //                 return () => clearInterval(timer);
    //             }, []);

    //             const handleZaloLogin = async () => {

    //                 try {
    //                     const res = await fetch(`https://taile-home.tail826ef1.ts.net/zalo/login`, {
    //                         method: 'GET',
    //                         headers: {
    //                             'Accept': 'application/json'
    //                         }
    //                     });
    //                     const data = await res.json();

    //                     // const response = await fetch(
    //                     //     "https://taile-home.tail826ef1.ts.net/zalo/auth/zalo"
    //                     //     // {
    //                     //     //     credentials: "include"
    //                     //     // }
    //                     // );

    //                     // console.log("Zalo login response:", response);

    //                     // window.location.href = "https://taile-home.tail826ef1.ts.net/zalo/login";

    //                     // const data = await response.json();
    //                     // console.log("Zalo login response:", data);

    //                     console.log("Zalo URL:", data.login);

    //                     window.location.href = data.login;
    //                 } catch (error) {
    //                     console.error("Lỗi đăng nhập Zalo:", error);
    //                 }
    //             };

    const hour = time.getHours();

    let welcomeDay = 0;
    if (hour >= 6 && hour < 12) welcomeDay = 1;
    else if (hour >= 12 && hour < 18) welcomeDay = 2;
    else if (hour >= 18 && hour <= 23) welcomeDay = 3;
    else if (hour >= 0 && hour < 6) welcomeDay = 4;

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