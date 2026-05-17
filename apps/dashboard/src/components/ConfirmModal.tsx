import React from 'react';
import { Sliders } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  t: any;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  t
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-header-icon">
          <Sliders size={28} />
        </div>
        <h3 className="modal-title">{t.confirmTitle}</h3>
        <p className="modal-desc">
          {t.confirmMessage}
        </p>
        <div className="modal-actions">
          <button 
            className="btn btn-secondary" 
            onClick={onClose}
            style={{ padding: '0.6rem 1.5rem', cursor: 'pointer' }}
          >
            {t.confirmNo}
          </button>
          <button 
            className="btn" 
            onClick={onConfirm}
            style={{ padding: '0.6rem 1.5rem', cursor: 'pointer' }}
          >
            {t.confirmYes}
          </button>
        </div>
      </div>
    </div>
  );
};
