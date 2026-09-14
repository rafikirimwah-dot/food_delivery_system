// frontend/src/components/LanguageToggle.js
import React, { useEffect, useState } from 'react';
import './LanguageToggle.css';

function LanguageToggle() {
  const [lang, setLang] = useState(localStorage.getItem('lang') || 'en');

  useEffect(() => {
    localStorage.setItem('lang', lang);
    window.dispatchEvent(new CustomEvent('langChange', { detail: lang }));
  }, [lang]);

  return (
    <div className="lang-toggle">
      <button
        className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
        onClick={() => setLang('en')}
      >EN</button>
      <button
        className={`lang-btn ${lang === 'sw' ? 'active' : ''}`}
        onClick={() => setLang('sw')}
      >SW</button>
    </div>
  );
}

export default LanguageToggle;