import { useEffect, useState } from 'react';
import { Routes, Route, Link, Outlet } from 'react-router-dom';
import axios from 'axios';

// Fallback when DB/Neon is slow or offline — replaced automatically when API responds
const FALLBACK_CATEGORIES = [
  { id: 1, name: 'Electronics', slug: 'electronics', icon: '📱' },
  { id: 2, name: 'Mobile Phones', slug: 'mobile-phones', icon: '📱' },
  { id: 3, name: 'Laptops', slug: 'laptops', icon: '💻' },
  { id: 4, name: 'Furniture', slug: 'furniture', icon: '🛋' },
  { id: 5, name: 'Vehicles', slug: 'vehicles', icon: '🚗' },
  { id: 6, name: 'Books', slug: 'books', icon: '📚' },
  { id: 7, name: 'Clothing', slug: 'clothing', icon: '👕' },
  { id: 8, name: 'Appliances', slug: 'appliances', icon: '🔌' },
  { id: 9, name: 'Sports', slug: 'sports', icon: '⚽' },
  { id: 10, name: 'Musical Instruments', slug: 'musical-instruments', icon: '🎸' },
  { id: 11, name: 'Home & Garden', slug: 'home-garden', icon: '🏡' },
  { id: 12, name: 'Other', slug: 'other', icon: '📦' },
];

async function fetchCategories() {
  const { data } = await axios.get('/api/v1/categories', { timeout: 8000 });
  if (data?.success && Array.isArray(data.data) && data.data.length) return data.data;
  throw new Error('No categories returned');
}

const companyLinks = [
  { label: 'About Us', to: '/about' },
  { label: 'Contact Us', to: '/contact' },
];

const helpLinks = [
  { label: 'Help Center', to: '/help' },
  { label: 'How to Buy', to: '/help/how-to-buy' },
  { label: 'How to Sell', to: '/help/how-to-sell' },
  { label: 'Safety Tips', to: '/help/safety' },
  { label: 'Blog', to: '/blog' },
];

const policyLinks = [
  { label: 'Terms and Conditions', to: '/terms' },
  { label: 'Privacy Policy', to: '/privacy' },
  { label: 'Prohibited & Restricted Items', to: '/policies/prohibited-items' },
  { label: 'Returns, Refunds & Disputes', to: '/policies/returns' },
  { label: 'Community Guidelines', to: '/community-guidelines' },
];

function Header() {
  return (
    <header className="header">
      <div className="container header__inner">
        <Link to="/" className="header__logo">
          <span className="header__logo-mark">F</span>
          <span className="header__logo-text">FERILO</span>
        </Link>
        <nav className="header__nav" aria-label="Main navigation">
          <Link to="/browse" className="header__nav-link">Browse</Link>
          <Link to="/help" className="header__nav-link">Help</Link>
        </nav>
        <div className="header__actions">
          <Link to="/login" className="header__btn header__btn--ghost">Login</Link>
          <Link to="/register" className="header__btn header__btn--primary">Sign Up</Link>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="footer">
      <div className="container footer__grid">
        <section className="footer__brand" aria-labelledby="footer-brand-heading">
          <h2 id="footer-brand-heading" className="footer__logo">FERILO</h2>
          <p className="footer__tagline">
            FERILO is Nepal&apos;s verified second-hand marketplace — connecting you to trusted
            local sellers for cars, property, electronics, furniture, and more. Zero listing fees.
            Verified sellers. Safer trade for everyone.
          </p>
          <ul className="footer__contact">
            <li><span className="footer__contact-icon" aria-hidden="true">📍</span>Kathmandu, Nepal</li>
            <li><span className="footer__contact-icon" aria-hidden="true">📞</span><a href="tel:+9779800000000">+977 980-0000000</a></li>
            <li><span className="footer__contact-icon" aria-hidden="true">✉️</span><a href="mailto:info@ferilo.local">info@ferilo.local</a></li>
          </ul>
          <div className="footer__social" aria-label="Social media links">
            <a href="#" className="footer__social-link" aria-label="Facebook">f</a>
            <a href="#" className="footer__social-link" aria-label="Instagram">ig</a>
            <a href="#" className="footer__social-link" aria-label="X">x</a>
            <a href="#" className="footer__social-link" aria-label="LinkedIn">in</a>
          </div>
        </section>
        <nav className="footer__column" aria-labelledby="footer-company-heading">
          <h3 id="footer-company-heading" className="footer__heading">Company</h3>
          <ul className="footer__links">
            {companyLinks.map((link) => (
              <li key={link.to}><Link to={link.to}>{link.label}</Link></li>
            ))}
          </ul>
        </nav>
        <nav className="footer__column" aria-labelledby="footer-help-heading">
          <h3 id="footer-help-heading" className="footer__heading">Help &amp; Support</h3>
          <ul className="footer__links">
            {helpLinks.map((link) => (
              <li key={link.to}><Link to={link.to}>{link.label}</Link></li>
            ))}
          </ul>
        </nav>
        <nav className="footer__column" aria-labelledby="footer-policies-heading">
          <h3 id="footer-policies-heading" className="footer__heading">Policies</h3>
          <ul className="footer__links">
            {policyLinks.map((link) => (
              <li key={link.to}><Link to={link.to}>{link.label}</Link></li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="footer__bottom">
        <div className="container">
          <p>© {year} FERILO — Nepal&apos;s Verified Second-Hand Marketplace · Made in Nepal</p>
        </div>
      </div>
    </footer>
  );
}

function HomePage() {
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES);
  const [dataSource, setDataSource] = useState('fallback');

  useEffect(() => {
    let cancelled = false;

    async function loadLiveCategories() {
      try {
        const live = await fetchCategories();
        if (!cancelled) {
          setCategories(live);
          setDataSource('live');
        }
      } catch {
        if (!cancelled) setDataSource('fallback');
      }
    }

    loadLiveCategories();
    const retry = setInterval(loadLiveCategories, 30000);
    return () => {
      cancelled = true;
      clearInterval(retry);
    };
  }, []);

  return (
    <div className="home">
      <section className="hero">
        <div className="container hero__inner">
          <p className="hero__eyebrow">Nepal&apos;s Verified Marketplace</p>
          <h1 className="hero__title">
            Buy. Sell. <span className="hero__highlight">Give It Another Life.</span>
          </h1>
          <p className="hero__subtitle">
            Discover trusted second-hand deals from verified sellers across Nepal. Safe meetups.
            Transparent delivery. Zero listing fees.
          </p>
          <form className="hero__search" role="search" aria-label="Search products">
            <label htmlFor="search-input" className="sr-only">Search products</label>
            <input id="search-input" type="search" placeholder="Search for phones, furniture, bikes..." className="hero__search-input" disabled />
            <button type="submit" className="hero__search-btn" disabled>Search</button>
          </form>
          <p className="hero__note">Search coming in Phase 8</p>
        </div>
      </section>

      <section className="categories">
        <div className="container">
          <div className="categories__head">
            <h2>Browse categories</h2>
            <span className={`categories__badge categories__badge--${dataSource}`}>
              {dataSource === 'live' ? 'Live from database' : 'Offline preview — connecting…'}
            </span>
          </div>
          <ul className="categories__grid">
            {categories.map((cat) => (
              <li key={cat.slug}>
                <Link to={`/categories/${cat.slug}`} className="categories__card">
                  <span className="categories__icon" aria-hidden="true">{cat.icon || '📦'}</span>
                  <span>{cat.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="trust">
        <div className="container trust__grid">
          <article className="trust__card">
            <span className="trust__icon" aria-hidden="true">✓</span>
            <h2>Verified Sellers</h2>
            <p>Identity-verified users you can trust before you buy or sell.</p>
          </article>
          <article className="trust__card">
            <span className="trust__icon" aria-hidden="true">🛡</span>
            <h2>Safe Transactions</h2>
            <p>Meetup or delivery with clear pricing and order tracking.</p>
          </article>
          <article className="trust__card">
            <span className="trust__icon" aria-hidden="true">♻</span>
            <h2>Sustainable Trade</h2>
            <p>Give pre-loved items a second life and reduce waste.</p>
          </article>
        </div>
      </section>
    </div>
  );
}

function Layout() {
  return (
    <div className="app-layout">
      <Header />
      <main className="app-main"><Outlet /></main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
      </Route>
    </Routes>
  );
}
