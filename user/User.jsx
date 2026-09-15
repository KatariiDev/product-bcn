import { useEffect, useState } from "react";
import "./User.css";

function User() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        try {
            const savedUser = localStorage.getItem("zalo_user");

            console.log("Dữ liệu user trong localStorage:", savedUser);

            if (savedUser) {
                const userData = JSON.parse(savedUser);

                console.log("User data:", userData);

                setUser(userData);
            }
        } catch (error) {
            console.error("Lỗi đọc thông tin user:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("zalo_user");

        // Xóa các dữ liệu đăng nhập Zalo khác nếu bạn đang lưu
        sessionStorage.clear();

        window.location.href = "/";
    };

    if (loading) {
        return <h2>Đang tải thông tin...</h2>;
    }

    if (!user) {
        return (
            <div>
                <h2>Bạn chưa đăng nhập</h2>

                <button
                    onClick={() => window.location.href = "/"}
                    style={{ backgroundColor: "#000" }}
                >
                    Đăng nhập
                </button>
            </div>
        );
    }

    return (
        <div className="user-page">
            <div className="user-header">
                <div className="user-logo">Ban Công Nghệ</div>
                <div className="user-card">
                    <img
                        src={user.picture?.data?.url}
                        alt="Avatar"
                        className="user-avatar"
                        style={{
                            width: "50px",
                            height: "50px",
                            borderRadius: "50%"
                        }}
                    />
                    <div className="user-info">
                        <p className="user-name">Xin chào, {user.name}</p>
                        <div className="user-role">
                            <p>
                                Member
                            </p>
                        </div>
                    </div>
                    <button
                        className="logout-button"
                        onClick={handleLogout}
                    >
                        Đăng xuất
                    </button>
                </div>
            </div>
        </div>
    );
}

export default User;