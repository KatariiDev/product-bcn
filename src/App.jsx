import './App.css'
import Login from './components/Login';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { StrictMode } from 'react';
import User from '../user/User';

import Admin from '../admin/Admin';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/user" element={<User />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>

    // <StrictMode>
    //   <Login />
    //   {/* <User /> */}
    // </StrictMode>
  );
}

export default App
