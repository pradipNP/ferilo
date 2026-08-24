import { useEffect, useState, createContext, useContext } from 'react';
import { Routes, Route, Link, Outlet, Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  fetchMe,
  loginRequest,
  registerRequest,
  logoutRequest,
  refreshAccessToken,
  clearAccessToken,
} from './api';

const AuthContext = createContext(null);

function useAuth() {
  return useContext(AuthContext);
}

// Fallback when DB/Neon is slow or offline
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

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        await refreshAccessToken();
        const me = await fetchMe();
        setUser(me);
      } catch {
        clearAccessToken();
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (email, password) => {
    const u = await loginRequest(email, password);
    setUser(u);
    return u;
  };

  const register = async (email, password, displayName) => {
    const u = await registerRequest(email, password, displayName);
    setUser(u);
    return u;
  };

  const logout = async () => {
    await logoutRequest();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

function Header() {
  const { user, logout } = useAuth();

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
          {user ? (
            <>
              <Link to="/app/dashboard" className="header__user">
                {user.displayName || user.email}
              </Link>
              <button type="button" className="header__btn header__btn--ghost" onClick={logout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="header__btn header__btn--ghost">Login</Link>
              <Link to="/register" className="header__btn header__btn--primary">Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function Footer() {
  const year = new Date().getFullYear();
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

  return (
    <footer className="footer">
      <div className="container footer__grid">
        <section className="footer__brand" aria-labelledby="footer-brand-heading">
          <h2 id="footer-brand-heading" className="footer__logo">FERILO</h2>
          <p className="footer__tagline">
            FERILO is Nepal&apos;s verified second-hand marketplace — connecting you to trusted
            local sellers for cars, property, electronics, furniture, and more.
          </p>
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
        <div className="container"><p>© {year} FERILO — Made in Nepal</p></div>
      </div>
    </footer>
  );
}

function HomePage() {
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES);
  const [dataSource, setDataSource] = useState('fallback');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const live = await fetchCategories();
        if (!cancelled) { setCategories(live); setDataSource('live'); }
      } catch {
        if (!cancelled) setDataSource('fallback');
      }
    }
    load();
    const retry = setInterval(load, 30000);
    return () => { cancelled = true; clearInterval(retry); };
  }, []);

  return (
    <div className="home">
      <section className="hero">
        <div className="container hero__inner">
          <p className="hero__eyebrow">Nepal&apos;s Verified Marketplace</p>
          <h1 className="hero__title">Buy. Sell. <span className="hero__highlight">Give It Another Life.</span></h1>
          <p className="hero__subtitle">Discover trusted second-hand deals from verified sellers across Nepal.</p>
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
    </div>
  );
}

function AuthForm({ title, submitLabel, onSubmit }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const isRegister = title === 'Create account';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await onSubmit(email, password, displayName);
      navigate('/app/dashboard');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>{title}</h1>
        <p className="auth-subtitle">{isRegister ? 'Join FERILO — buy and sell with trust.' : 'Welcome back to FERILO.'}</p>
        {error && <p className="auth-error" role="alert">{error}</p>}
        <form onSubmit={handleSubmit} className="auth-form">
          {isRegister && (
            <label>
              Display name
              <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required minLength={2} />
            </label>
          )}
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete={isRegister ? 'new-password' : 'current-password'} />
          </label>
          <button type="submit" className="auth-submit" disabled={submitting}>
            {submitting ? 'Please wait…' : submitLabel}
          </button>
        </form>
        <p className="auth-switch">
          {isRegister ? (
            <>Already have an account? <Link to="/login">Login</Link></>
          ) : (
            <>New here? <Link to="/register">Create account</Link></>
          )}
        </p>
      </div>
    </div>
  );
}

function LoginPage() {
  const { login, user } = useAuth();
  if (user) return <Navigate to="/app/dashboard" replace />;
  return <AuthForm title="Login" submitLabel="Login" onSubmit={(email, password) => login(email, password)} />;
}

function RegisterPage() {
  const { register, user } = useAuth();
  if (user) return <Navigate to="/app/dashboard" replace />;
  return (
    <AuthForm
      title="Create account"
      submitLabel="Sign up"
      onSubmit={(email, password, displayName) => register(email, password, displayName)}
    />
  );
}

function DashboardPage() {
  const { user } = useAuth();
  return (
    <div className="dashboard">
      <div className="container">
        <h1>Hello, {user.displayName || user.email}</h1>
        <p className="dashboard__meta">
          Role: <strong>{user.role}</strong> · Verification: <strong>{user.verificationStatus}</strong>
        </p>
        <div className="dashboard__cards">
          <article className="trust__card">
            <h2>My Listings</h2>
            <p>Coming in Phase 7</p>
          </article>
          <article className="trust__card">
            <h2>Verify Identity</h2>
            <p>Coming in Phase 6</p>
          </article>
        </div>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="container auth-loading">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function GuestRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="container auth-loading">Loading…</div>;
  if (user) return <Navigate to="/app/dashboard" replace />;
  return children;
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
    <AuthProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
          <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
          <Route path="/app/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
