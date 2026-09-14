// frontend/src/components/AdminImagesFixer.js
import React, { useState, useEffect } from 'react';
import { FaMagic, FaImage, FaCheck, FaUpload, FaSearch } from 'react-icons/fa';
import axios from 'axios';
import { useToast } from './ToastContext';
import LazyImage from './LazyImage';
import './AdminImagesFixer.css';

function AdminImagesFixer() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [urlInputs, setUrlInputs] = useState({});
  const [uploading, setUploading] = useState({});
  const { showToast } = useToast();

  useEffect(() => { fetchBroken(); }, []);

  const fetchBroken = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/admin/broken-images', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setItems(res.data);
    } catch (err) {
      showToast('Failed to load', 'error');
    } finally {
      setLoading(false);
    }
  };

  const saveUrl = async (id) => {
    const url = urlInputs[id];
    if (!url || !url.trim()) return showToast('Enter a URL first', 'warning');
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `http://localhost:5000/api/admin/food-items/${id}/image`,
        { image_url: url.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast('Image saved ✅', 'success');
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (err) {
      showToast('Failed to save', 'error');
    }
  };

  const uploadFile = async (id, file) => {
    if (!file) return;
    setUploading(p => ({ ...p, [id]: true }));
    try {
      const token = localStorage.getItem('token');
      const fd = new FormData();
      fd.append('image', file);
      await axios.post(
        `http://localhost:5000/api/admin/food-items/${id}/image-upload`,
        fd,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      showToast('Image uploaded ✅', 'success');
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (err) {
      showToast('Upload failed', 'error');
    } finally {
      setUploading(p => ({ ...p, [id]: false }));
    }
  };

  const autoFixAll = async () => {
    if (!window.confirm(`Auto-fix all ${items.length} broken images with best matches?`)) return;
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        'http://localhost:5000/api/admin/broken-images/auto-fix',
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast(`Auto-fixed ${res.data.fixed} items ✨`, 'success');
      fetchBroken();
    } catch (err) {
      showToast('Auto-fix failed', 'error');
    }
  };

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.hotel_name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="loading-container"><div className="spinner" /></div>;

  return (
    <div className="imgfixer-page">
      <div className="imgfixer-head">
        <div>
          <h1><FaImage /> Fix Missing Images</h1>
          <p>{items.length} item{items.length !== 1 && 's'} need fixing</p>
        </div>
        {items.length > 0 && (
          <button className="btn-primary-warm" onClick={autoFixAll}>
            <FaMagic /> Auto-Fix All
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="imgfixer-empty">
          <div className="ife-icon">✅</div>
          <h2>All images look good</h2>
          <p>Every menu item has a valid image.</p>
        </div>
      ) : (
        <>
          <div className="imgfixer-search">
            <FaSearch />
            <input
              type="text"
              placeholder="Search by item or hotel…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="imgfixer-grid">
            {filtered.map(item => (
              <div className="imgfixer-card" key={item.id}>
                <div className="ifc-preview" style={{ background: `${item.brand_color}10` }}>
                  {item.image_url ? (
                    <LazyImage src={item.image_url} alt={item.name} aspectRatio="16/9" />
                  ) : (
                    <span>🖼️</span>
                  )}
                </div>
                <div className="ifc-info">
                  <span className="ifc-hotel" style={{ color: item.brand_color }}>
                    {item.hotel_emoji} {item.hotel_name}
                  </span>
                  <h3>{item.name}</h3>
                  <span className="ifc-cat">{item.category}</span>
                </div>
                <div className="ifc-actions">
                  <div className="ifc-url-row">
                    <input
                      type="url"
                      placeholder="Paste image URL…"
                      value={urlInputs[item.id] || ''}
                      onChange={e => setUrlInputs(p => ({ ...p, [item.id]: e.target.value }))}
                    />
                    <button className="ifc-save" onClick={() => saveUrl(item.id)}>
                      <FaCheck />
                    </button>
                  </div>
                  <label className="ifc-upload">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => uploadFile(item.id, e.target.files[0])}
                      style={{ display: 'none' }}
                    />
                    {uploading[item.id] ? 'Uploading…' : <><FaUpload /> Upload photo</>}
                  </label>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default AdminImagesFixer;