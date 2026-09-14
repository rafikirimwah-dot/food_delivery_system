// frontend/src/components/Hotels.js
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  FaStar, FaClock, FaMotorcycle, FaSearch, FaHeart, FaRegHeart,
  FaMapMarkerAlt, FaArrowRight, FaFire, FaTimes, FaFilter,
  FaThLarge, FaList, FaChevronDown, FaCheck, FaSlidersH
} from 'react-icons/fa';
import axios from 'axios';
import LazyImage from './LazyImage';
import { useToast } from './ToastContext';
import { HotelCardSkeleton } from './Skeletons';
import './Hotels.css';

// ============================================
// CONSTANTS
// ============================================
const CUISINES = [
  { id: 'all', label: 'All', icon: '🍽️' },
  { id: 'pizza', label: 'Pizza', icon: '🍕' },
  { id: 'burger', label: 'Burgers', icon: '🍔' },
  { id: 'chicken', label: 'Chicken', icon: '🍗' },
  { id: 'pasta', label: 'Pasta', icon: '🍝' },
  { id: 'sushi', label: 'Sushi', icon: '🍣' },
  { id: 'fast food', label: 'Fast Food', icon: '🍟' },
  { id: 'international', label: 'International', icon: '🌍' },
  { id: 'fine dining', label: 'Fine Dining', icon: '👑' },
  { id: 'local', label: 'Local', icon: '🌿' }
];

const PRICE_RANGES = [
  { id: 'all', label: 'Any price', min: null, max: null },
  { id: 'budget', label: 'Under KSh 700', min: 0, max: 700 },
  { id: 'mid', label: 'KSh 700 – 1,500', min: 700, max: 1500 },
  { id: 'premium', label: 'KSh 1,500 – 3,000', min: 1500, max: 3000 },
  { id: 'luxury', label: 'KSh 3,000+', min: 3000, max: 1000000 }
];

const SORT_OPTIONS = [
  { id: 'recommended', label: 'Recommended', icon: '✨' },
  { id: 'rating', label: 'Top rated', icon: '⭐' },
  { id: 'fastest', label: 'Fastest', icon: '⚡' },
  { id: 'cheapest', label: 'Cheapest', icon: '💰' },
  { id: 'nearest', label: 'Nearest', icon: '📍' }
];

const USER_LOCATION = { lat: -1.286389, lng: 36.817223 };

function Hotels() {
  const [hotels, setHotels] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [cuisine, setCuisine] = useState('all');
  const [priceRange, setPriceRange] = useState('all');
  const [sortBy, setSortBy] = useState('recommended');
  const [minRating, setMinRating] = useState(0);
  const [openNowOnly, setOpenNowOnly] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // UI state
  const [viewMode, setViewMode] = useState('grid');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const sortMenuRef = useRef(null);
  const { showToast } = useToast();
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const token = localStorage.getItem('token');

  // ============================================
  // DEBOUNCE SEARCH INPUT
  // ============================================
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // ============================================
  // INITIAL DATA FETCH
  // ============================================
  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const promises = [
          axios.get('http://localhost:5000/api/hotels'),
          axios.get('http://localhost:5000/api/hotels/hero-featured')
        ];
        if (token) {
          promises.push(
            axios.get('http://localhost:5000/api/users/favorites/ids', {
              headers: { Authorization: `Bearer ${token}` }
            })
          );
        }
        const [hotelsRes, featuredRes, favsRes] = await Promise.all(promises);
        setHotels(hotelsRes.data);
        setFeatured(featuredRes.data);
        if (favsRes) setFavorites(favsRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchInitial();
  }, [token]);

  // ============================================
  // FETCH FILTERED RESULTS
  // ============================================
  const [serverResults, setServerResults] = useState(null);
  const [resultsLoading, setResultsLoading] = useState(false);

  useEffect(() => {
    const hasActiveFilters =
      debouncedSearch ||
      cuisine !== 'all' ||
      priceRange !== 'all' ||
      minRating > 0 ||
      openNowOnly;

    if (!hasActiveFilters) {
      setServerResults(null);
      return;
    }

    const fetchFiltered = async () => {
      setResultsLoading(true);
      try {
        const params = new URLSearchParams();
        if (debouncedSearch) params.append('q', debouncedSearch);
        if (cuisine !== 'all') params.append('cuisine', cuisine);

        if (priceRange !== 'all') {
          const range = PRICE_RANGES.find(p => p.id === priceRange);
          if (range.min !== null) params.append('minPrice', range.min);
          if (range.max !== null) params.append('maxPrice', range.max);
        }

        if (minRating > 0) params.append('minRating', minRating);
        if (openNowOnly) params.append('openNow', 'true');
        params.append('sort', sortBy);

        const res = await axios.get(
          `http://localhost:5000/api/hotels/search?${params.toString()}`
        );
        setServerResults(res.data.hotels || []);
      } catch (err) {
        console.error(err);
        setServerResults([]);
      } finally {
        setResultsLoading(false);
      }
    };

    fetchFiltered();
  }, [debouncedSearch, cuisine, priceRange, minRating, openNowOnly, sortBy]);

  // Close sort menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target)) {
        setShowSortMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Lock body scroll when mobile filters open
  useEffect(() => {
    document.body.style.overflow = showMobileFilters ? 'hidden' : 'auto';
    return () => { document.body.style.overflow = 'auto'; };
  }, [showMobileFilters]);

  // ============================================
  // FAVORITES
  // ============================================
  const toggleFavorite = async (hotelId, e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!token || user?.role !== 'user') {
      showToast('Login as a customer to save favorites', 'warning');
      return;
    }

    try {
      const res = await axios.post(
        `http://localhost:5000/api/favorites/${hotelId}/toggle`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setFavorites(prev =>
        res.data.favorited
          ? [...prev, hotelId]
          : prev.filter(id => id !== hotelId)
      );
      showToast(res.data.favorited ? 'Saved ❤️' : 'Removed', 'success');
    } catch (err) {
      showToast('Failed to update favorite', 'error');
    }
  };

  // ============================================
  // HELPERS
  // ============================================
  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const isOpenNow = (openingHours) => {
    if (!openingHours) return true;
    try {
      const now = new Date();
      const currentHour = now.getHours() + now.getMinutes() / 60;
      const parts = openingHours.split(/[–-]/).map(s => s.trim());
      if (parts.length !== 2) return true;

      const parseTime = (str) => {
        const match = str.match(/(\d+):?(\d*)\s*(AM|PM)/i);
        if (!match) return null;
        let h = parseInt(match[1]);
        const m = parseInt(match[2] || '0');
        const ampm = match[3].toUpperCase();
        if (ampm === 'PM' && h !== 12) h += 12;
        if (ampm === 'AM' && h === 12) h = 0;
        return h + m / 60;
      };

      const open = parseTime(parts[0]);
      const close = parseTime(parts[1]);
      if (open === null || close === null) return true;

      if (close < open) return currentHour >= open || currentHour <= close;
      return currentHour >= open && currentHour <= close;
    } catch {
      return true;
    }
  };

  // ============================================
  // CLIENT-SIDE SORT (only when no server results)
  // ============================================
  const finalHotels = useMemo(() => {
    const source = serverResults !== null ? serverResults : hotels;

    const enriched = source.map(h => ({
      ...h,
      distance: calculateDistance(
        USER_LOCATION.lat, USER_LOCATION.lng,
        h.latitude || -1.286389, h.longitude || 36.817223
      ),
      is_open_now: isOpenNow(h.opening_hours),
      delivery_avg: ((h.delivery_time_min || 20) + (h.delivery_time_max || 40)) / 2
    }));

    let result = enriched;

    // Client-side filters that don't need server round-trip
    if (openNowOnly) result = result.filter(h => h.is_open_now);
    if (showFavoritesOnly) result = result.filter(h => favorites.includes(h.id));

    // Sort
    if (sortBy === 'nearest') {
      result = [...result].sort((a, b) => a.distance - b.distance);
    } else if (sortBy === 'rating' && serverResults !== null) {
      result = [...result].sort((a, b) =>
        (parseFloat(b.effective_rating) || 0) - (parseFloat(a.effective_rating) || 0)
      );
    }

    return result;
  }, [serverResults, hotels, openNowOnly, showFavoritesOnly, sortBy, favorites]);

  // ============================================
  // ACTIVE FILTER CHIPS
  // ============================================
  const activeFilters = useMemo(() => {
    const chips = [];
    if (searchInput) chips.push({ key: 'search', label: `"${searchInput}"`, clear: () => { setSearchInput(''); setDebouncedSearch(''); } });
    if (cuisine !== 'all') {
      const c = CUISINES.find(x => x.id === cuisine);
      if (c) chips.push({ key: 'cuisine', label: `${c.icon} ${c.label}`, clear: () => setCuisine('all') });
    }
    if (priceRange !== 'all') {
      const p = PRICE_RANGES.find(x => x.id === priceRange);
      if (p) chips.push({ key: 'price', label: p.label, clear: () => setPriceRange('all') });
    }
    if (minRating > 0) chips.push({ key: 'rating', label: `⭐ ${minRating}+`, clear: () => setMinRating(0) });
    if (openNowOnly) chips.push({ key: 'open', label: '🟢 Open now', clear: () => setOpenNowOnly(false) });
    if (showFavoritesOnly) chips.push({ key: 'fav', label: '❤️ Favorites', clear: () => setShowFavoritesOnly(false) });
    return chips;
  }, [searchInput, cuisine, priceRange, minRating, openNowOnly, showFavoritesOnly]);

  const clearAllFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setCuisine('all');
    setPriceRange('all');
    setMinRating(0);
    setOpenNowOnly(false);
    setShowFavoritesOnly(false);
  };

  const getSortLabel = () => SORT_OPTIONS.find(s => s.id === sortBy)?.label || 'Recommended';

  const formatKSh = (n) => `KSh ${Math.round(parseFloat(n || 0)).toLocaleString()}`;

  // ============================================
  // LOADING
  // ============================================
  if (loading) {
    return (
      <div className="hotels-page">
        <div className="hotels-hero">
          <div className="hotels-hero-inner">
            <h1>Loading restaurants…</h1>
          </div>
        </div>
        <div className="hotels-grid">
          {[1, 2, 3, 4, 5, 6].map(i => <HotelCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  const isFiltering = serverResults !== null;

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="hotels-page">
      {/* HERO */}
      <section className="hotels-hero">
        <div className="hotels-hero-blob hero-blob-a" />
        <div className="hotels-hero-blob hero-blob-b" />
        <div className="hotels-hero-inner">
          <span className="hero-eyebrow">
            <span className="dot" /> {hotels.length} restaurants · Nairobi
          </span>
          <h1>
            Discover Nairobi's<br />
            <em>best food</em>, delivered.
          </h1>
          <p className="hotels-hero-lede">
            Search by dish, cuisine, or price. Every restaurant hand-picked, every dish real.
          </p>

          <div className="hotels-hero-search">
            <FaSearch />
            <input
              type="text"
              placeholder="Search dish, cuisine or restaurant…"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
            />
            {searchInput && (
              <button className="hero-search-clear" onClick={() => setSearchInput('')}>
                <FaTimes />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* FEATURED (only when not filtering) */}
      {!isFiltering && featured.length > 0 && (
        <section className="featured-row">
          <div className="featured-header">
            <h2>✨ Trending this week</h2>
            <p>Most-ordered restaurants right now</p>
          </div>
          <div className="featured-scroll">
            {featured.map((hotel, idx) => (
              <Link
                to={`/hotel/${hotel.id}`}
                key={hotel.id}
                className="featured-card-lg"
                style={{
                  '--hotel-color': hotel.brand_color || '#C97B5F',
                  animationDelay: `${idx * 80}ms`
                }}
              >
                <div className="fcl-image">
                  <LazyImage
                    src={hotel.hero_image_url || `https://picsum.photos/seed/hero${hotel.id}/800/500`}
                    alt={hotel.name}
                    aspectRatio="16/10"
                  />
                  <div className="fcl-gradient" style={{
                    background: `linear-gradient(to top, ${hotel.brand_color}EE 0%, ${hotel.brand_color}80 40%, transparent 70%)`
                  }} />
                  <div className="fcl-badge"><FaFire /> Trending</div>
                  <button
                    className={`fcl-fav ${favorites.includes(hotel.id) ? 'active' : ''}`}
                    onClick={(e) => toggleFavorite(hotel.id, e)}
                    aria-label="Favorite"
                  >
                    {favorites.includes(hotel.id) ? <FaHeart /> : <FaRegHeart />}
                  </button>
                </div>
                <div className="fcl-body">
                  <div className="fcl-top">
                    <span className="fcl-emoji">{hotel.emoji || '🍽️'}</span>
                    <div>
                      <h3>{hotel.name}</h3>
                      <p className="fcl-tagline">{hotel.tagline || hotel.cuisine_type}</p>
                    </div>
                  </div>
                  <div className="fcl-meta">
                    <span className="fcl-stat">
                      <FaStar style={{ color: '#FFC107' }} />
                      {hotel.rating ? parseFloat(hotel.rating).toFixed(1) : 'New'}
                    </span>
                    <span className="fcl-stat">
                      <FaClock /> {hotel.delivery_time_min || 20}–{hotel.delivery_time_max || 40} min
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* DESKTOP FILTER BAR */}
      <section className="filters-bar-wrap">
        <div className="filters-bar">
          <div className="cuisine-scroll">
            {CUISINES.map(c => (
              <button
                key={c.id}
                className={`cuisine-chip ${cuisine === c.id ? 'active' : ''}`}
                onClick={() => setCuisine(c.id)}
              >
                <span>{c.icon}</span>
                <span>{c.label}</span>
              </button>
            ))}
          </div>

          <div className="filters-secondary">
            {/* Price dropdown */}
            <div className="filter-select">
              <select value={priceRange} onChange={e => setPriceRange(e.target.value)}>
                {PRICE_RANGES.map(p => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
              <FaChevronDown />
            </div>

            {/* Rating */}
            <button
              className={`filter-pill ${minRating > 0 ? 'active' : ''}`}
              onClick={() => setMinRating(prev => prev === 0 ? 4 : prev === 4 ? 4.5 : 0)}
            >
              <FaStar style={{ color: minRating > 0 ? '#FFC107' : 'var(--muted)' }} />
              {minRating > 0 ? `${minRating}+` : 'Rating'}
            </button>

            {/* Open now */}
            <button
              className={`filter-pill ${openNowOnly ? 'active' : ''}`}
              onClick={() => setOpenNowOnly(!openNowOnly)}
            >
              🟢 Open now
            </button>

            {/* Favorites */}
            {token && user?.role === 'user' && (
              <button
                className={`filter-pill ${showFavoritesOnly ? 'active' : ''}`}
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              >
                <FaHeart style={{ color: showFavoritesOnly ? '#C97B5F' : 'var(--muted)' }} />
                Favorites
              </button>
            )}

            {/* Sort */}
            <div className="sort-wrap" ref={sortMenuRef}>
              <button className="filter-pill sort-trigger" onClick={() => setShowSortMenu(!showSortMenu)}>
                <FaFilter /> {getSortLabel()} <FaChevronDown />
              </button>
              {showSortMenu && (
                <div className="sort-menu">
                  {SORT_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      className={`sort-item ${sortBy === opt.id ? 'active' : ''}`}
                      onClick={() => { setSortBy(opt.id); setShowSortMenu(false); }}
                    >
                      <span>{opt.icon}</span>
                      <span>{opt.label}</span>
                      {sortBy === opt.id && <FaCheck className="sort-check" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* View */}
            <div className="view-toggle">
              <button className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')} aria-label="Grid">
                <FaThLarge />
              </button>
              <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')} aria-label="List">
                <FaList />
              </button>
            </div>
          </div>
        </div>

        {activeFilters.length > 0 && (
          <div className="active-filters">
            <span className="af-label">Active:</span>
            {activeFilters.map(chip => (
              <button key={chip.key} className="af-chip" onClick={chip.clear}>
                {chip.label} <FaTimes />
              </button>
            ))}
            <button className="af-clear-all" onClick={clearAllFilters}>Clear all</button>
          </div>
        )}
      </section>

      {/* MOBILE FILTER TRIGGER — sticky at top on scroll */}
      <div className="mobile-filter-bar">
        <button
          className="mf-search-btn"
          onClick={() => document.querySelector('.hotels-hero-search input')?.focus()}
        >
          <FaSearch /> {searchInput ? `"${searchInput.slice(0, 20)}${searchInput.length > 20 ? '…' : ''}"` : 'Search'}
        </button>
        <button
          className={`mf-filter-btn ${activeFilters.length > 0 ? 'active' : ''}`}
          onClick={() => setShowMobileFilters(true)}
        >
          <FaSlidersH /> Filters
          {activeFilters.length > 0 && <span className="mf-count">{activeFilters.length}</span>}
        </button>
      </div>

      {/* RESULTS */}
      <section className="results-wrap">
        <div className="results-head">
          <h2>
            {resultsLoading
              ? 'Searching…'
              : `${finalHotels.length} restaurant${finalHotels.length !== 1 ? 's' : ''}`}
            {cuisine !== 'all' && !resultsLoading && ` · ${CUISINES.find(c => c.id === cuisine)?.label}`}
          </h2>
          <span className="results-sub">
            Sorted by <strong>{getSortLabel().toLowerCase()}</strong>
          </span>
        </div>

        {resultsLoading ? (
          <div className="hotels-grid">
            {[1, 2, 3, 4].map(i => <HotelCardSkeleton key={i} />)}
          </div>
        ) : finalHotels.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🍽️</div>
            <h3>No restaurants match</h3>
            <p>Try clearing filters or a different search.</p>
            <button className="btn-primary-warm" onClick={clearAllFilters}>
              Clear all filters
            </button>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'hotels-grid' : 'hotels-list'}>
            {finalHotels.map((hotel, idx) => {
              const isFav = favorites.includes(hotel.id);
              const hasMatchedDishes = hotel.matched_dishes && hotel.matched_dishes.length > 0;
              const showMatchedDishes = isFiltering && debouncedSearch && hasMatchedDishes;

              return (
                <Link
                  to={`/hotel/${hotel.id}`}
                  key={hotel.id}
                  className={`hotel-card-advanced ${viewMode === 'list' ? 'list-mode' : ''}`}
                  style={{
                    '--hotel-color': hotel.brand_color || '#C97B5F',
                    animationDelay: `${Math.min(idx * 40, 400)}ms`
                  }}
                >
                  <div className="hca-image">
                    <LazyImage
                      src={hotel.hero_image_url || `https://picsum.photos/seed/hotel${hotel.id}/600/400`}
                      alt={hotel.name}
                      aspectRatio={viewMode === 'grid' ? '5/3.2' : '1/1'}
                    />
                    <div
                      className="hca-gradient"
                      style={{
                        background: `linear-gradient(to top, ${hotel.brand_color}CC 0%, transparent 55%)`
                      }}
                    />

                    <div className="hca-badges">
                      <span className="hca-vibe-badge" style={{ background: hotel.brand_color }}>
                        {hotel.vibe || 'Signature'}
                      </span>
                      {hotel.is_open_now ? (
                        <span className="hca-open-badge">
                          <span className="pulse-dot" /> Open
                        </span>
                      ) : (
                        <span className="hca-closed-badge">Closed</span>
                      )}
                    </div>

                    <span className="hca-emoji">{hotel.emoji || '🍽️'}</span>

                    <button
                      className={`hca-fav ${isFav ? 'active' : ''}`}
                      onClick={(e) => toggleFavorite(hotel.id, e)}
                      aria-label="Favorite"
                    >
                      {isFav ? <FaHeart /> : <FaRegHeart />}
                    </button>
                  </div>

                  <div className="hca-body">
                    <div className="hca-head">
                      <h3>{hotel.name}</h3>
                      <span className="hca-rating">
                        <FaStar style={{ color: '#FFC107' }} />
                        {hotel.rating ? parseFloat(hotel.rating).toFixed(1) : 'New'}
                        {hotel.rating_count > 0 && <em>({hotel.rating_count})</em>}
                      </span>
                    </div>

                    <p className="hca-tagline">
                      {hotel.tagline || hotel.cuisine_type}
                    </p>

                    <div className="hca-meta-row">
                      <span className="hca-meta">
                        <FaClock /> {hotel.delivery_time_min || 20}–{hotel.delivery_time_max || 40} min
                      </span>
                      <span className="hca-meta">
                        <FaMapMarkerAlt /> {hotel.distance.toFixed(1)} km
                      </span>
                      <span className="hca-meta free">
                        <FaMotorcycle /> Free
                      </span>
                    </div>

                    {/* Matched dishes preview (only when searching) */}
                    {showMatchedDishes && (
                      <div className="hca-dishes">
                        <div className="hca-dishes-label">
                          <span>Matches on menu</span>
                          <em>{hotel.matched_dishes.length}</em>
                        </div>
                        <div className="hca-dishes-list">
                          {hotel.matched_dishes.slice(0, 3).map(d => (
                            <div className="hca-dish" key={d.id}>
                              <span className="hca-dish-name">{d.name}</span>
                              <span className="hca-dish-price">{formatKSh(d.price)}</span>
                            </div>
                          ))}
                          {hotel.matched_dishes.length > 3 && (
                            <div className="hca-dish-more">
                              + {hotel.matched_dishes.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {viewMode === 'list' && !showMatchedDishes && (
                      <p className="hca-desc">
                        {hotel.description || 'Fresh, delicious food prepared with care.'}
                      </p>
                    )}

                    <div className="hca-footer">
                      <span className="hca-cuisine">{hotel.cuisine_type}</span>
                      {hotel.min_dish_price > 0 && (
                        <span className="hca-price-hint">
                          from {formatKSh(hotel.min_dish_price)}
                        </span>
                      )}
                      <span className="hca-cta">
                        View <FaArrowRight />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* MOBILE FILTERS BOTTOM SHEET */}
      {showMobileFilters && (
        <>
          <div className="mf-overlay" onClick={() => setShowMobileFilters(false)} />
          <div className="mf-sheet">
            <div className="mf-sheet-handle" />
            <div className="mf-sheet-header">
              <h3>Filters</h3>
              <button className="mf-close" onClick={() => setShowMobileFilters(false)}>
                <FaTimes />
              </button>
            </div>

            <div className="mf-sheet-body">
              {/* Price */}
              <div className="mf-section">
                <label className="mf-section-label">Price range</label>
                <div className="mf-price-grid">
                  {PRICE_RANGES.map(p => (
                    <button
                      key={p.id}
                      className={`mf-price-chip ${priceRange === p.id ? 'active' : ''}`}
                      onClick={() => setPriceRange(p.id)}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rating */}
              <div className="mf-section">
                <label className="mf-section-label">Minimum rating</label>
                <div className="mf-rating-row">
                  {[0, 3, 4, 4.5].map(r => (
                    <button
                      key={r}
                      className={`mf-rating-chip ${minRating === r ? 'active' : ''}`}
                      onClick={() => setMinRating(r)}
                    >
                      {r === 0 ? 'Any' : (
                        <><FaStar style={{ color: '#FFC107' }} /> {r}+</>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggles */}
              <div className="mf-section">
                <div className="mf-toggle">
                  <span>🟢 Open now</span>
                  <button
                    className={`mf-switch ${openNowOnly ? 'on' : ''}`}
                    onClick={() => setOpenNowOnly(!openNowOnly)}
                  >
                    <span className="mf-switch-thumb" />
                  </button>
                </div>
                {token && user?.role === 'user' && (
                  <div className="mf-toggle">
                    <span>❤️ Favorites only</span>
                    <button
                      className={`mf-switch ${showFavoritesOnly ? 'on' : ''}`}
                      onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                    >
                      <span className="mf-switch-thumb" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="mf-sheet-footer">
              <button className="mf-reset-btn" onClick={clearAllFilters}>Reset</button>
              <button
                className="mf-apply-btn"
                onClick={() => setShowMobileFilters(false)}
              >
                Show {finalHotels.length} results
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Hotels;