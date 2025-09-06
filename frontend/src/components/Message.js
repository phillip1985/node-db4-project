import React from 'react';
import './Message.css';

const Message = ({ type, children, onClose }) => {
  if (!children) return null;

  return (
    <div className={`message message-${type}`}>
      <span>{children}</span>
      {onClose && (
        <button className="message-close-btn" onClick={onClose} aria-label="Close">
          &times;
        </button>
      )}
    </div>
  );
};

export default Message;