import React from 'react';
import './ConfirmModal.css';

const ConfirmModal = ({ show, message, onConfirm, onCancel }) => {
    if (!show) return null;
    return (
        <div className="confirm-modal">
            <div className="confirm-modal-content">
                <p>{message}</p>
                <button onClick={onConfirm} className="confirm-btn">Yes</button>
                <button onClick={onCancel} className="cancel-btn">No</button>
            </div>
        </div>
    );
};

export default ConfirmModal;