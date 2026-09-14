import { useEffect, useState } from "react";
import "./User.css";

function User() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("https://taile-home.tail826ef1.ts.net/zalo/login", {
            credentials: "include"
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error("Chưa đăng nhập");
                }

                console.log("Response from /zalo/login:", response);

                return response;
            })
            .then((data) => {
                if (data.success && data.user) {
                    setUser(data.user);
                } else {
                    throw new Error(data.message || "Không lấy được thông tin user");
                }
            })
            .catch((error) => {
                console.error("Lỗi lấy thông tin user:", error);
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    const handleLogout = async () => {
        try {
            await fetch("http://localhost:3000/api/logout", {
                method: "POST",
                credentials: "include"
            });

            window.location.href = "/";
        } catch (error) {
            console.error("Lỗi đăng xuất:", error);
        }
    };

    if (loading) {
        return <h2>Đang tải thông tin...</h2>;
    }

    if (!user) {
        return (
            <div>
                <h2>Bạn chưa đăng nhập</h2>
                <button onClick={() => window.location.href = "/"} style={{ backgroundColor: '#000' }}>
                    Đăng nhập
                </button>
            </div>
        );
    }

    return (
        <div className="user-page">

            <div className="user-card">

                {/* {user.avatar && ( */}
                <img
                    // src={user.avatar}
                    src="../src/assets/bcn.png"
                    alt="Avatar"
                    className="user-avatar"
                    style={{ width: "100px", height: "100px", borderRadius: "50%" }}
                />
                {/* )} */}

                <h1>
                    Xin chào,
                    {/* {user.name} */}
                </h1>

                <div className="user-info">
                    <p>
                        <strong>Zalo ID:</strong>
                    </p>

                    <p>
                        {/* {user.id} */}
                        {'tag 2'}
                    </p>
                </div>

                <div className="user-info">
                    <p>
                        <strong>Tên:</strong>
                    </p>

                    <p>
                        {/* {user.name} */}
                        {'tag 3'}
                    </p>
                </div>

                <button
                    className="logout-button"
                // onClick={handleLogout}
                >
                    Đăng xuất
                </button>

            </div>

        </div>
    );
}

export default User;