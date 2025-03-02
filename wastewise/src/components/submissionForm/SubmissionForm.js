"use client";

import React, { useState } from 'react';
import axios from 'axios';
import styles from './SubmissionForm.module.css';

const SubmissionForm = () => {
  const [wasteType, setWasteType] = useState('');
  const [quantity, setQuantity] = useState('');
  const [image, setImage] = useState(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!wasteType || !quantity) {
      setError('Please fill in all required fields.');
      return;
    }
    setError('');
    
    const formData = new FormData();
    formData.append('wasteType', wasteType);
    formData.append('quantity', quantity);
    if (image) {
      formData.append('image', image);
    }

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
      const response = await axios.post(`${backendUrl}/api/submit`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccessMessage(response.data.message);
      setWasteType('');
      setQuantity('');
      setImage(null);
    } catch (err) {
      setError('Submission failed. Please try again.');
      console.error(err);
    }
  };

  return (
    <div className={styles.formContainer}>
      <div className={styles.card}>
        <h2 className={styles.header}>Form Submission</h2>
        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <p className={styles.error}>{error}</p>}
          {successMessage && <p className={styles.success}>{successMessage}</p>}
          <div className={styles.formGroup}>
            <label htmlFor="wasteType" className={styles.label}>Waste Category:</label>
            <select
              id="wasteType"
              value={wasteType}
              onChange={(e) => setWasteType(e.target.value)}
              className={styles.input}
            >
              <option value="">Select a category</option>
              <option value="plastic">Plastic</option>
              <option value="paper">Paper</option>
              <option value="organic">Organic Waste (e.g., food waste)</option>
              <option value="general">General Waste</option>
              <option value="glass">Glass</option>
              <option value="metal">Metal</option>
              <option value="e-waste">Electronic Waste (E-Waste)</option>
              <option value="textiles">Textiles</option>
              <option value="hazardous">Hazardous Waste</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="quantity" className={styles.label}>Quantity (kg):</label>
            <input
              id="quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="0"
              className={styles.input}
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="image" className={styles.label}>Upload Image (optional):</label>
            <input
              id="image"
              type="file"
              onChange={(e) => setImage(e.target.files[0])}
              className={styles.input}
            />
          </div>
          <button type="submit" className={styles.submitButton}>Submit</button>
        </form>
      </div>
    </div>
  );
};

export default SubmissionForm;
