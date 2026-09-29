import React from 'react';
import './Toast.css';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export function Toast({ toast, onClose }) {
  if (!toast) return null;

  const icons = {
    success: <CheckCircle2 size={20} className="toast-icon success" />,
    error: <AlertCircle size={20} className="toast-icon error" />,
    info: <Info size={20} className="toast-icon info" />,
    warning: <AlertCircle size={20} className="toast-icon warning" />
  };

  return (
    <div className={`toast-notification ${toast.type || 'info'}`}>
      <div className="toast-icon-wrap">
        {icons[toast.type || 'info']}
      </div>
      <div className="toast-content">
        {toast.title && <div className="toast-title">{toast.title}</div>}
        <div className="toast-message">{toast.message}</div>
      </div>
      <button className="toast-close" onClick={onClose}>
        <X size={16} />
      </button>
    </div>
  );
}

export function ConfirmModal({ modal, onClose, onConfirm }) {
  if (!modal || !modal.isOpen) return null;

  return (
    <div className="custom-modal-overlay" onClick={onClose}>
      <div className="custom-modal-box" onClick={e => e.stopPropagation()}>
        <div className="custom-modal-header">
          <div className="custom-modal-icon-wrap warning">
            <AlertCircle size={24} />
          </div>
          <h3 className="custom-modal-title">{modal.title || 'Xác nhận thao tác'}</h3>
        </div>
        <p className="custom-modal-message">{modal.message}</p>
        <div className="custom-modal-actions">
          <button className="btn-modal-cancel" onClick={onClose}>
            {modal.cancelText || 'Hủy bỏ'}
          </button>
          <button 
            className={`btn-modal-confirm ${modal.danger ? 'danger' : 'primary'}`} 
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {modal.confirmText || 'Đồng ý'}
          </button>
        </div>
      </div>
    </div>
  );
}
