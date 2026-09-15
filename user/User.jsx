import { useEffect, useState } from "react";
import "./User.css";
import { LogOut } from 'lucide-react';
import bcn from '../src/assets/bcn.png';

function User() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [gender, setGender] = useState("...");
    const [size, setSize] = useState("...");
    const [count, setCount] = useState(1);

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

    const handleChoiceGender = (selectedGender) => {
        setGender(selectedGender);
    }

    const handleChoiceSize = (selectedSize) => {
        setSize(selectedSize);
    }

    const handlePurchase = async () => {
        if (gender === "...") {
            alert("Vui lòng chọn giới tính");
            return;
        }

        if (size === "...") {
            alert("Vui lòng chọn size");
            return;
        }

        const orderData = {
            zaloId: user.id,
            name: user.name,
            productName: "NGUYEN VAN HUNG",
            gender: gender,
            size: size,
            quantity: count,
            price: 999999
        };

        console.log("Dữ liệu gửi lên server:", orderData);

        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/api/orders`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(orderData)
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Đặt hàng thất bại");
            }

            console.log("Order:", data);

            alert("Đặt hàng thành công!");

        } catch (error) {
            console.error("Lỗi purchase:", error);
            alert("Có lỗi xảy ra khi đặt hàng");
        }
    };

    return (
        <div className="user-page">
            <div className="user-header">
                <div className="user-logo">
                    <img src={bcn} alt="Logo" className="logo-img" />
                    Ban Công Nghệ
                </div>
                <div className="user-card">
                    <img
                        src={user.picture?.data?.url}
                        alt="Avatar"
                        className="user-avatar"
                        style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "50%"
                        }}
                    />
                    <div className="user-info">
                        <p className="user-name">
                            {user.name}
                        </p>
                        <div className="user-role">
                            <p>Admin</p>
                        </div>
                    </div>
                    <button
                        className="logout-button"
                        onClick={handleLogout}
                    >
                        <LogOut />
                    </button>
                </div>
            </div>
            <div className="user-content">
                <div className="show-left">hello</div>
                <div className="show-right">
                    <div className="pro-section1">
                        <p className="product-tag">Limited Edition</p>
                        <p className="product-name">NGUYEN VAN HUNG</p>
                        <p className="product-price">$999,999</p>
                        <p className="product-note">Free shipping</p>
                    </div>
                    <div className="pro-section2">
                        <div className="pr-gender">
                            <p className="product-gender">Gender - <span className="gender-value">{gender}</span></p>
                            <div className="product-gender-choice">
                                <button className="choice choice-gender" onClick={() => handleChoiceGender("Male")}>
                                    Male
                                </button>
                                <button className="choice choice-gender" onClick={() => handleChoiceGender("Female")}>
                                    Female
                                </button>
                            </div>
                        </div>
                        <div className="pr-size">
                            <p className="product-size">Size - <span className="size-value">{size}</span></p>
                            <div className="product-size-choice">
                                {(gender == 'Male') ?
                                    (<>
                                        <button className="choice choice-size" onClick={() => handleChoiceSize("S")}>S</button>
                                        <button className="choice choice-size" onClick={() => handleChoiceSize("M")}>M</button>
                                        <button className="choice choice-size" onClick={() => handleChoiceSize("L")}>L</button>
                                        <button className="choice choice-size" onClick={() => handleChoiceSize("XL")}>XL</button>
                                    </>) :
                                    (gender == 'Female') ? (
                                        <>
                                            <button className="choice choice-size" onClick={() => handleChoiceSize("XS")}>XS</button>
                                            <button className="choice choice-size" onClick={() => handleChoiceSize("S")}>S</button>
                                            <button className="choice choice-size" onClick={() => handleChoiceSize("M")}>M</button>
                                            <button className="choice choice-size" onClick={() => handleChoiceSize("L")}>L</button>
                                        </>
                                    ) : null
                                }
                            </div>
                        </div>
                        <div className="pr-quantity">
                            <p className="product-quantity">Quantity</p>
                            <div className="product-quantity-choice">
                                <button className="choice choice-quantity" onClick={() => setCount(Math.max(1, count - 1))}>-</button>
                                <button className="choice choice-quantity">{count}</button>
                                <button className="choice choice-quantity" onClick={() => setCount(Math.min(3, count + 1))}>+</button>
                            </div>
                        </div>
                        <div className="pr-buy">
                            <button className="buy-button" onClick={handlePurchase}>Purchase now</button>
                        </div>
                    </div>
                    <div className="pro-section3"></div>
                </div>
            </div>
        </div >
    );
}

export default User;