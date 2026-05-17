import React from 'react';

interface ToastNotificationProps {
  toastMessage: { text: string; type: 'success' | 'error' } | null;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({ toastMessage }) => {
  if (!toastMessage) return null;

  return (
    <div className="toast-container">
      <div className={`toast-box ${toastMessage.type === 'success' ? 'toast-success' : 'toast-error'}`}>
        <span>{toastMessage.text}</span>
      </div>
    </div>
  );
};
