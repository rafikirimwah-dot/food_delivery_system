// frontend/src/components/Skeletons.js
import React from 'react';
import './Skeletons.css';

export const SkeletonBox = ({ w = '100%', h = '1rem', r = '12px', className = '' }) => (
  <div className={`skeleton-box ${className}`} style={{ width: w, height: h, borderRadius: r }} />
);

export const HotelCardSkeleton = () => (
  <div className="skeleton-hotel-card">
    <SkeletonBox h="200px" r="20px 20px 0 0" />
    <div style={{ padding: '1.2rem' }}>
      <SkeletonBox w="40%" h="14px" r="50px" />
      <div style={{ height: '0.7rem' }} />
      <SkeletonBox w="70%" h="20px" />
      <div style={{ height: '0.5rem' }} />
      <SkeletonBox w="90%" h="14px" />
      <div style={{ height: '1rem' }} />
      <div style={{ display: 'flex', gap: '0.6rem' }}>
        <SkeletonBox w="60px" h="12px" />
        <SkeletonBox w="70px" h="12px" />
        <SkeletonBox w="50px" h="12px" />
      </div>
    </div>
  </div>
);

export const MenuCardSkeleton = () => (
  <div className="skeleton-menu-card">
    <SkeletonBox h="190px" r="20px 20px 0 0" />
    <div style={{ padding: '1.2rem' }}>
      <SkeletonBox w="65%" h="18px" />
      <div style={{ height: '0.5rem' }} />
      <SkeletonBox w="100%" h="13px" />
      <div style={{ height: '0.3rem' }} />
      <SkeletonBox w="80%" h="13px" />
      <div style={{ height: '1rem' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <SkeletonBox w="70px" h="22px" />
        <SkeletonBox w="100px" h="30px" r="50px" />
      </div>
    </div>
  </div>
);

export const OrderCardSkeleton = () => (
  <div className="skeleton-order-card">
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <SkeletonBox w="52px" h="52px" r="16px" />
        <div>
          <SkeletonBox w="80px" h="10px" />
          <div style={{ height: '0.4rem' }} />
          <SkeletonBox w="140px" h="16px" />
        </div>
      </div>
      <SkeletonBox w="90px" h="30px" r="50px" />
    </div>
    <SkeletonBox w="100%" h="1px" />
    <div style={{ height: '1rem' }} />
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <SkeletonBox w="120px" h="28px" />
      <SkeletonBox w="140px" h="32px" r="50px" />
    </div>
  </div>
);

export const StatCardSkeleton = () => (
  <div className="skeleton-stat-card">
    <SkeletonBox w="52px" h="52px" r="16px" />
    <div style={{ flex: 1 }}>
      <SkeletonBox w="60%" h="12px" />
      <div style={{ height: '0.5rem' }} />
      <SkeletonBox w="80%" h="20px" />
    </div>
  </div>
);