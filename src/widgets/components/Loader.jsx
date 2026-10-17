import React from 'react';
import './../../style/loader-style.css';

export default function Loader({ isLoading, text = "Loading..." }) {
  if (!isLoading) return null;

  return (
    <div className="loading-overlay active">
      <div className="spinner-box">
        <div className="spinner"></div>
        <div className="loading-text">{text}</div>
      </div>
    </div>
  );
}