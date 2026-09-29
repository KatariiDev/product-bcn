import './App.css'
import Login from './components/Login';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { StrictMode } from 'react';
import User from '../user/User';

import Admin from '../admin/Admin';

import { Navigate } from 'react-router-dom';

// Component bảo vệ Route: Kiểm tra nếu chưa đăng nhập thì đẩy về trang chủ / login
function ProtectedRoute({ children }) {
  const savedUser = localStorage.getItem('zalo_user');
  if (!savedUser) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route 
          path="/user" 
          element={
            <ProtectedRoute>
              <User />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App
