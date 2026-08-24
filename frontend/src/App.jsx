import { useEffect, useState, createContext, useContext, useMemo } from 'react';
import { Routes, Route, Link, Outlet, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import {
  fetchMe,
  loginRequest,
  registerRequest,
  logoutRequest,
  refreshAccessToken,
  clearAccessToken,
  updateProfile,
  fetchVerificationStatus,
  submitVerification,
  fetchAdminVerifications,
  approveVerification,
  rejectVerification,
  fetchProducts,
  fetchProduct,
  fetchMyProduct,
  fetchMyProducts,
  createProduct,
  updateProduct,
  publishProduct,
  deleteProduct,
  uploadProductImages,
  deleteProductImage,
  fetchCategories,
  fetchCategoryBySlug,
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

async function fetchCategoriesPublic() {
  const { data } = await axios.get('/api/v1/categories', { timeout: 8000 });
  if (data?.success && Array.isArray(data.data) && data.data.length) return data.data;
  throw new Error('No categories returned');
}

const CONDITIONS = [
  { value: 'NEW_LIKE', label: 'Like New' },
  { value: 'GOOD', label: 'Good' },
  { value: 'FAIR', label: 'Fair' },
  { value: 'POOR', label: 'Poor' },
];

const SIZE_TIERS = [
  { value: 'SMALL', label: 'Small' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LARGE', label: 'Large' },
  { value: 'EXTRA_LARGE', label: 'Extra Large' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
];

function filtersFromSearchParams(searchParams, fixedCategoryId) {
  return {
    q: searchParams.get('q') || '',
    categoryId: fixedCategoryId ? String(fixedCategoryId) : (searchParams.get('categoryId') || ''),
    city: searchParams.get('city') || '',
    district: searchParams.get('district') || '',
    condition: searchParams.get('condition') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    sort: searchParams.get('sort') || 'newest',
    verifiedOnly: searchParams.get('verifiedOnly') === 'true',
    page: searchParams.get('page') || '1',
  };
}

function searchParamsFromFilters(filters) {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set('q', filters.q.trim());
  if (filters.categoryId) params.set('categoryId', filters.categoryId);
  if (filters.city.trim()) params.set('city', filters.city.trim());
  if (filters.district.trim()) params.set('district', filters.district.trim());
  if (filters.condition) params.set('condition', filters.condition);
  if (filters.minPrice !== '') params.set('minPrice', filters.minPrice);
  if (filters.maxPrice !== '') params.set('maxPrice', filters.maxPrice);
  if (filters.sort && filters.sort !== 'newest') params.set('sort', filters.sort);
  if (filters.verifiedOnly) params.set('verifiedOnly', 'true');
  if (filters.page && filters.page !== '1') params.set('page', filters.page);
  return params;
}

function buildProductQuery(filters) {
  const params = { limit: 24, page: Number(filters.page) || 1 };
  if (filters.q.trim()) params.q = filters.q.trim();
  if (filters.categoryId) params.categoryId = filters.categoryId;
  if (filters.city.trim()) params.city = filters.city.trim();
  if (filters.district.trim()) params.district = filters.district.trim();
  if (filters.condition) params.condition = filters.condition;
  if (filters.minPrice !== '') params.minPrice = filters.minPrice;
  if (filters.maxPrice !== '') params.maxPrice = filters.maxPrice;
  if (filters.sort) params.sort = filters.sort;
  if (filters.verifiedOnly) params.verifiedOnly = true;
  return params;
}

function formatPrice(price) {
  return `Rs. ${Number(price).toLocaleString('en-NP')}`;
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

  const refreshUser = async () => {
    const me = await fetchMe();
    setUser(me);
    return me;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

function HeaderSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    navigate(params.toString() ? `/browse?${params.toString()}` : '/browse');
  };

  return (
    <form className="header__search" onSubmit={handleSubmit}>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search listings…"
        aria-label="Search listings"
      />
      <button type="submit" className="header__search-btn">Search</button>
    </form>
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
        <HeaderSearch />
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
        const live = await fetchCategoriesPublic();
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
          Role: <strong>{user.role}</strong> · Verification:{' '}
          <span className={`badge badge--${user.verificationStatus?.toLowerCase()}`}>
            {user.verificationStatus}
          </span>
        </p>
        <div className="dashboard__cards">
          <Link to="/app/listings" className="trust__card dashboard__link">
            <h2>My Listings</h2>
            <p>Create and manage your products.</p>
          </Link>
          <Link to="/app/listings/new" className="trust__card dashboard__link">
            <h2>Post an Ad</h2>
            <p>Sell something — verification required.</p>
          </Link>
          <Link to="/app/profile" className="trust__card dashboard__link">
            <h2>Edit Profile</h2>
            <p>Update your name, city, and bio.</p>
          </Link>
          <Link to="/app/verification" className="trust__card dashboard__link">
            <h2>Verify Identity</h2>
            <p>Required to publish listings.</p>
          </Link>
          {user.role === 'ADMIN' && (
            <Link to="/admin/verifications" className="trust__card dashboard__link">
              <h2>Admin: Verifications</h2>
              <p>Review pending identity requests.</p>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [form, setForm] = useState({
    displayName: user.displayName || '',
    phone: user.phone || '',
    city: user.city || '',
    district: user.district || '',
    bio: user.bio || '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await updateProfile(form);
      await refreshUser();
      setMessage('Profile updated successfully.');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dashboard">
      <div className="container narrow">
        <h1>My Profile</h1>
        {message && <p className="auth-success">{message}</p>}
        {error && <p className="auth-error">{error}</p>}
        <form className="auth-form profile-form" onSubmit={handleSubmit}>
          <label>Display name<input name="displayName" value={form.displayName} onChange={handleChange} required /></label>
          <label>Phone<input name="phone" value={form.phone} onChange={handleChange} placeholder="+977 9800000000" /></label>
          <label>City<input name="city" value={form.city} onChange={handleChange} placeholder="Kathmandu" /></label>
          <label>District<input name="district" value={form.district} onChange={handleChange} placeholder="Kathmandu" /></label>
          <label>Bio<textarea name="bio" value={form.bio} onChange={handleChange} rows={4} maxLength={500} /></label>
          <button type="submit" className="auth-submit" disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</button>
        </form>
      </div>
    </div>
  );
}

function VerificationPage() {
  const { user, refreshUser } = useAuth();
  const [status, setStatus] = useState(null);
  const [documentType, setDocumentType] = useState('CITIZENSHIP');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchVerificationStatus().then(setStatus).catch(() => {});
  }, []);

  const canSubmit = !status?.latest || ['REJECTED', 'RESUBMISSION_REQUIRED'].includes(status?.latest?.status)
    || (user.verificationStatus === 'UNVERIFIED' && !status?.latest);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');
    const formData = new FormData(e.target);
    formData.set('documentType', documentType);
    try {
      const result = await submitVerification(formData);
      setStatus(result);
      await refreshUser();
      setMessage('Verification submitted. An admin will review your documents.');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="dashboard">
      <div className="container narrow">
        <h1>Identity Verification</h1>
        <p className="auth-subtitle">
          Upload demo/test documents for portfolio review. Documents are stored privately and never shown to other users.
        </p>
        <p className="dashboard__meta">
          Status:{' '}
          <span className={`badge badge--${user.verificationStatus?.toLowerCase()}`}>
            {user.verificationStatus}
          </span>
        </p>
        {status?.latest?.rejectionReason && (
          <p className="auth-error">Previous rejection: {status.latest.rejectionReason}</p>
        )}
        {message && <p className="auth-success">{message}</p>}
        {error && <p className="auth-error">{error}</p>}
        {user.verificationStatus === 'VERIFIED' ? (
          <p className="auth-success">Your identity is verified. You can publish listings (Phase 7).</p>
        ) : canSubmit ? (
          <form className="auth-form profile-form" onSubmit={handleSubmit}>
            <label>
              Document type
              <select value={documentType} onChange={(e) => setDocumentType(e.target.value)}>
                <option value="CITIZENSHIP">Citizenship (demo)</option>
                <option value="PASSPORT">Passport (demo)</option>
                <option value="DRIVING_LICENSE">Driving license (demo)</option>
              </select>
            </label>
            <label>Front side (required)<input type="file" name="front" accept="image/jpeg,image/png,application/pdf" required /></label>
            <label>Back side (optional)<input type="file" name="back" accept="image/jpeg,image/png,application/pdf" /></label>
            <label>Selfie (optional)<input type="file" name="selfie" accept="image/jpeg,image/png" /></label>
            <button type="submit" className="auth-submit" disabled={submitting}>
              {submitting ? 'Uploading…' : 'Submit for verification'}
            </button>
          </form>
        ) : (
          <p className="auth-subtitle">Your verification is under review. Please check back later.</p>
        )}
      </div>
    </div>
  );
}

function AdminVerificationsPage() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    fetchAdminVerifications()
      .then(setQueue)
      .catch(() => setError('Failed to load verification queue.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleApprove = async (id) => {
    await approveVerification(id);
    load();
  };

  const handleReject = async (id) => {
    const reason = window.prompt('Rejection reason (min 5 characters):');
    if (!reason || reason.length < 5) return;
    await rejectVerification(id, reason);
    load();
  };

  return (
    <div className="dashboard">
      <div className="container">
        <h1>Verification Queue</h1>
        {error && <p className="auth-error">{error}</p>}
        {loading ? (
          <p className="auth-loading">Loading…</p>
        ) : queue.length === 0 ? (
          <p className="auth-subtitle">No pending verifications.</p>
        ) : (
          <ul className="admin-list">
            {queue.map((item) => (
              <li key={item.id} className="admin-list__item">
                <div>
                  <strong>{item.display_name || item.email}</strong>
                  <p>{item.document_type} · {item.document_count} file(s) · {new Date(item.submitted_at).toLocaleString()}</p>
                </div>
                <div className="admin-list__actions">
                  <button type="button" className="header__btn header__btn--primary" onClick={() => handleApprove(item.id)}>Approve</button>
                  <button type="button" className="header__btn header__btn--ghost" onClick={() => handleReject(item.id)}>Reject</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function VerifiedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="container auth-loading">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'ADMIN' && user.verificationStatus !== 'VERIFIED') {
    return <Navigate to="/app/verification" replace />;
  }
  return children;
}

function ProductGrid({ products }) {
  if (!products.length) {
    return <p className="auth-subtitle">No listings match your filters. Try adjusting your search.</p>;
  }

  return (
    <ul className="product-grid">
      {products.map((p) => (
        <li key={p.id}>
          <Link to={`/products/${p.id}`} className="product-card">
            <div className="product-card__img">
              {p.images?.[0]?.url ? (
                <img src={p.images[0].url} alt="" loading="lazy" />
              ) : (
                <span className="product-card__placeholder">No image</span>
              )}
            </div>
            <div className="product-card__body">
              <h2>{p.title}</h2>
              <p className="product-card__price">{formatPrice(p.price)}</p>
              <p className="product-card__meta">{p.condition.replace('_', ' ').toLowerCase()} · {p.city}</p>
              {p.seller?.verificationStatus === 'VERIFIED' && (
                <span className="badge badge--verified">Verified seller</span>
              )}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function ProductListingPage({ fixedCategoryId, pageTitle, categoryIcon }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 24, total: 0 });
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState(() => filtersFromSearchParams(searchParams, fixedCategoryId));

  const activeFilters = useMemo(
    () => filtersFromSearchParams(searchParams, fixedCategoryId),
    [searchParams, fixedCategoryId],
  );

  const queryParams = useMemo(() => buildProductQuery(activeFilters), [activeFilters]);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => setCategories(FALLBACK_CATEGORIES));
  }, []);

  useEffect(() => {
    setDraft(filtersFromSearchParams(searchParams, fixedCategoryId));
  }, [searchParams, fixedCategoryId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchProducts(queryParams)
      .then((result) => {
        if (cancelled) return;
        setProducts(result.products);
        setMeta(result.meta || { page: 1, limit: 24, total: result.products.length });
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [queryParams]);

  const handleDraftChange = (e) => {
    const { name, value, type, checked } = e.target;
    setDraft((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const applyFilters = (e) => {
    e.preventDefault();
    setSearchParams(searchParamsFromFilters({ ...draft, page: '1' }));
  };

  const clearFilters = () => {
    const cleared = {
      q: '',
      categoryId: fixedCategoryId ? String(fixedCategoryId) : '',
      city: '',
      district: '',
      condition: '',
      minPrice: '',
      maxPrice: '',
      sort: 'newest',
      verifiedOnly: false,
      page: '1',
    };
    setDraft(cleared);
    setSearchParams(searchParamsFromFilters(cleared));
  };

  const handleSortChange = (e) => {
    const sort = e.target.value;
    const next = { ...activeFilters, sort, page: '1' };
    setDraft((prev) => ({ ...prev, sort }));
    setSearchParams(searchParamsFromFilters(next));
  };

  const goToPage = (page) => {
    setSearchParams(searchParamsFromFilters({ ...activeFilters, page: String(page) }));
  };

  const totalPages = Math.max(1, Math.ceil(meta.total / meta.limit));
  const topLevelCategories = categories.filter((c) => !c.parent_id);

  return (
    <div className="dashboard">
      <div className="container">
        <div className="browse-head">
          <h1>
            {categoryIcon && <span className="browse-head__icon" aria-hidden="true">{categoryIcon}</span>}
            {pageTitle || 'Browse listings'}
          </h1>
          {!loading && (
            <p className="browse-head__count">
              {meta.total} {meta.total === 1 ? 'listing' : 'listings'} found
            </p>
          )}
        </div>

        <div className="browse-layout">
          <aside className="browse-filters">
            <h2>Filters</h2>
            <form className="browse-filters__form" onSubmit={applyFilters}>
              <label>
                Search
                <input name="q" type="search" value={draft.q} onChange={handleDraftChange} placeholder="Title, brand…" />
              </label>
              {!fixedCategoryId && (
                <label>
                  Category
                  <select name="categoryId" value={draft.categoryId} onChange={handleDraftChange}>
                    <option value="">All categories</option>
                    {topLevelCategories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </label>
              )}
              <label>
                City
                <input name="city" value={draft.city} onChange={handleDraftChange} placeholder="e.g. Kathmandu" />
              </label>
              <label>
                District
                <input name="district" value={draft.district} onChange={handleDraftChange} placeholder="e.g. Lalitpur" />
              </label>
              <label>
                Condition
                <select name="condition" value={draft.condition} onChange={handleDraftChange}>
                  <option value="">Any condition</option>
                  {CONDITIONS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </label>
              <div className="browse-filters__row">
                <label>
                  Min price
                  <input name="minPrice" type="number" min="0" value={draft.minPrice} onChange={handleDraftChange} placeholder="0" />
                </label>
                <label>
                  Max price
                  <input name="maxPrice" type="number" min="0" value={draft.maxPrice} onChange={handleDraftChange} placeholder="Any" />
                </label>
              </div>
              <label className="checkbox-label">
                <input name="verifiedOnly" type="checkbox" checked={draft.verifiedOnly} onChange={handleDraftChange} />
                Verified sellers only
              </label>
              <div className="browse-filters__actions">
                <button type="submit" className="header__btn header__btn--primary">Apply filters</button>
                <button type="button" className="header__btn header__btn--ghost" onClick={clearFilters}>Clear</button>
              </div>
            </form>
          </aside>

          <section className="browse-results">
            <div className="browse-toolbar">
              <label className="browse-toolbar__sort">
                Sort by
                <select value={activeFilters.sort} onChange={handleSortChange}>
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </label>
            </div>

            {loading ? (
              <p className="auth-loading">Loading…</p>
            ) : (
              <>
                <ProductGrid products={products} />
                {meta.total > meta.limit && (
                  <nav className="browse-pagination" aria-label="Pagination">
                    <button
                      type="button"
                      className="header__btn header__btn--ghost"
                      disabled={meta.page <= 1}
                      onClick={() => goToPage(meta.page - 1)}
                    >
                      Previous
                    </button>
                    <span>Page {meta.page} of {totalPages}</span>
                    <button
                      type="button"
                      className="header__btn header__btn--ghost"
                      disabled={meta.page >= totalPages}
                      onClick={() => goToPage(meta.page + 1)}
                    >
                      Next
                    </button>
                  </nav>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function BrowsePage() {
  return <ProductListingPage />;
}

function CategoryPage() {
  const { slug } = useParams();
  const [category, setCategory] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setCategory(null);
    setError('');
    fetchCategoryBySlug(slug)
      .then(setCategory)
      .catch(() => setError('Category not found.'));
  }, [slug]);

  if (error) return <div className="container auth-loading">{error}</div>;
  if (!category) return <div className="container auth-loading">Loading…</div>;

  return (
    <ProductListingPage
      fixedCategoryId={category.id}
      pageTitle={category.name}
      categoryIcon={category.icon}
    />
  );
}

function ProductDetailPage() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProduct(id).then(setProduct).catch(() => setError('Product not found.'));
  }, [id]);

  if (error) return <div className="container auth-loading">{error}</div>;
  if (!product) return <div className="container auth-loading">Loading…</div>;

  return (
    <div className="dashboard">
      <div className="container product-detail">
        <div className="product-detail__gallery">
          {product.images?.length ? (
            product.images.map((img) => (
              <img key={img.id} src={img.url} alt={product.title} loading="lazy" />
            ))
          ) : (
            <div className="product-card__placeholder">No images</div>
          )}
        </div>
        <div className="product-detail__info">
          <h1>{product.title}</h1>
          <p className="product-card__price">{formatPrice(product.price)}</p>
          <p className="product-card__meta">
            {product.condition} · {product.city}, {product.district}
          </p>
          {product.seller?.verificationStatus === 'VERIFIED' && (
            <span className="badge badge--verified">Verified seller</span>
          )}
          <p className="product-detail__desc">{product.description}</p>
          <dl className="product-detail__facts">
            <div><dt>Category</dt><dd>{product.categoryName}</dd></div>
            {product.brand && <div><dt>Brand</dt><dd>{product.brand}</dd></div>}
            {product.isNegotiable && <div><dt>Price</dt><dd>Negotiable</dd></div>}
            <div><dt>Delivery</dt><dd>{product.deliveryEligible ? 'Available' : 'Meetup only'}</dd></div>
          </dl>
          <p className="auth-subtitle">Seller: {product.seller?.displayName || 'Unknown'}</p>
        </div>
      </div>
    </div>
  );
}

function MyListingsPage() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetchMyProducts().then(setListings).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this listing?')) return;
    await deleteProduct(id);
    load();
  };

  return (
    <div className="dashboard">
      <div className="container">
        <div className="categories__head">
          <h1>My Listings</h1>
          <Link to="/app/listings/new" className="header__btn header__btn--primary">+ New listing</Link>
        </div>
        {loading ? (
          <p className="auth-loading">Loading…</p>
        ) : listings.length === 0 ? (
          <p className="auth-subtitle">No listings yet. <Link to="/app/listings/new">Create your first ad</Link></p>
        ) : (
          <ul className="admin-list">
            {listings.map((p) => (
              <li key={p.id} className="admin-list__item">
                <div>
                  <strong>{p.title}</strong>
                  <p>{formatPrice(p.price)} · {p.status} · {p.city}</p>
                </div>
                <div className="admin-list__actions">
                  <Link to={`/app/listings/${p.id}/edit`} className="header__btn header__btn--ghost">Edit</Link>
                  {p.status === 'DRAFT' && (
                    <button type="button" className="header__btn header__btn--primary" onClick={async () => { await publishProduct(p.id); load(); }}>
                      Publish
                    </button>
                  )}
                  <button type="button" className="header__btn header__btn--ghost" onClick={() => handleDelete(p.id)}>Remove</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ListingFormPage({ editId }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [pageError, setPageError] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [formError, setFormError] = useState('');
  const [photosMessage, setPhotosMessage] = useState('');
  const [photosError, setPhotosError] = useState('');
  const [saving, setSaving] = useState(false);
  const [productId, setProductId] = useState(editId || null);
  const [images, setImages] = useState([]);
  const [form, setForm] = useState({
    title: '', description: '', categoryId: '', condition: 'GOOD', price: '',
    city: user?.city || 'Kathmandu', district: user?.district || 'Kathmandu',
    brand: '', isNegotiable: true, deliverySizeTier: 'SMALL', requiresTrolley: false,
  });

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {});
    if (editId) {
      fetchMyProduct(editId).then((p) => {
        setForm({
          title: p.title, description: p.description, categoryId: String(p.categoryId),
          condition: p.condition, price: String(p.price), city: p.city, district: p.district,
          brand: p.brand || '', isNegotiable: p.isNegotiable, deliverySizeTier: p.deliverySizeTier,
          requiresTrolley: p.requiresTrolley,
        });
        setImages(p.images || []);
      }).catch(() => setPageError('Listing not found.'));
    }
  }, [editId]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    setFormMessage('');
    try {
      const payload = {
        ...form,
        categoryId: Number(form.categoryId),
        price: Number(form.price),
      };
      let product;
      if (productId) {
        product = await updateProduct(productId, payload);
      } else {
        product = await createProduct(payload);
        if (!product?.id) throw new Error('Invalid response from server');
        setProductId(product.id);
      }
      setFormMessage('Listing saved as draft.');
      return product;
    } catch (err) {
      setFormError(err.response?.data?.error?.message || err.message || 'Failed to save.');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleImages = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (!productId) {
      setPhotosError('Save the listing first, then upload images.');
      return;
    }
    setSaving(true);
    setPhotosError('');
    setPhotosMessage('');
    try {
      const product = await uploadProductImages(productId, files);
      setImages(product.images || []);
      setPhotosMessage('Images uploaded.');
    } catch (err) {
      setPhotosError(err.response?.data?.error?.message || 'Image upload failed.');
    } finally {
      setSaving(false);
      e.target.value = '';
    }
  };

  const handleRemoveImage = async (imageId) => {
    if (!productId) return;
    setSaving(true);
    setPhotosError('');
    setPhotosMessage('');
    try {
      await deleteProductImage(productId, imageId);
      setImages((prev) => prev.filter((img) => img.id !== imageId));
      setPhotosMessage('Photo removed.');
    } catch (err) {
      setPhotosError(err.response?.data?.error?.message || 'Failed to remove photo.');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!productId) {
      setPhotosError('Save the listing and add at least one image first.');
      return;
    }
    setSaving(true);
    setPhotosError('');
    try {
      await publishProduct(productId);
      navigate('/app/listings');
    } catch (err) {
      setPhotosError(err.response?.data?.error?.message || 'Publish failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dashboard">
      <div className="container narrow">
        <h1>{editId ? 'Edit listing' : 'Create listing'}</h1>
        {pageError && <p className="auth-error">{pageError}</p>}
        <form className="auth-form profile-form" onSubmit={handleSave}>
          <label>Title<input name="title" value={form.title} onChange={handleChange} required minLength={3} /></label>
          <label>Description<textarea name="description" value={form.description} onChange={handleChange} required minLength={10} rows={5} /></label>
          <label>Category
            <select name="categoryId" value={form.categoryId} onChange={handleChange} required>
              <option value="">Select category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label>Condition
            <select name="condition" value={form.condition} onChange={handleChange}>
              {CONDITIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </label>
          <label>Price (NPR)<input name="price" type="number" min="0" value={form.price} onChange={handleChange} required /></label>
          <label>Brand (optional)<input name="brand" value={form.brand} onChange={handleChange} /></label>
          <label>City<input name="city" value={form.city} onChange={handleChange} required /></label>
          <label>District<input name="district" value={form.district} onChange={handleChange} required /></label>
          <label>Delivery size
            <select name="deliverySizeTier" value={form.deliverySizeTier} onChange={handleChange}>
              {SIZE_TIERS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </label>
          <label className="checkbox-label">
            <input name="isNegotiable" type="checkbox" checked={form.isNegotiable} onChange={handleChange} /> Price is negotiable
          </label>
          <label className="checkbox-label">
            <input name="requiresTrolley" type="checkbox" checked={form.requiresTrolley} onChange={handleChange} /> Requires trolley (large item)
          </label>
          <button type="submit" className="auth-submit" disabled={saving}>{saving ? 'Saving…' : 'Save draft'}</button>
          {formMessage && <p className="auth-success form-feedback">{formMessage}</p>}
          {formError && <p className="auth-error form-feedback">{formError}</p>}
        </form>
        {productId && (
          <div className="listing-images">
            <h2>Photos ({images.length}/8)</h2>
            {photosMessage && <p className="auth-success form-feedback">{photosMessage}</p>}
            {photosError && <p className="auth-error form-feedback">{photosError}</p>}
            <div className="listing-images__grid">
              {images.map((img) => (
                <div key={img.id} className="listing-images__item">
                  <img src={img.url} alt="" />
                  <button
                    type="button"
                    className="listing-images__remove"
                    onClick={() => handleRemoveImage(img.id)}
                    disabled={saving}
                    aria-label="Remove photo"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <label className="auth-form">
              Add images
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleImages} />
            </label>
            <button type="button" className="auth-submit" onClick={handlePublish} disabled={saving || images.length < 1}>
              Publish listing
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function EditListingPage() {
  const { id } = useParams();
  return <ListingFormPage editId={id} />;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="container auth-loading">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'ADMIN') return <Navigate to="/app/dashboard" replace />;
  return children;
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
          <Route path="/browse" element={<BrowsePage />} />
          <Route path="/categories/:slug" element={<CategoryPage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
          <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
          <Route path="/app/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/app/listings" element={<ProtectedRoute><MyListingsPage /></ProtectedRoute>} />
          <Route path="/app/listings/new" element={<ProtectedRoute><VerifiedRoute><ListingFormPage /></VerifiedRoute></ProtectedRoute>} />
          <Route path="/app/listings/:id/edit" element={<ProtectedRoute><VerifiedRoute><EditListingPage /></VerifiedRoute></ProtectedRoute>} />
          <Route path="/app/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/app/verification" element={<ProtectedRoute><VerificationPage /></ProtectedRoute>} />
          <Route path="/admin/verifications" element={<AdminRoute><AdminVerificationsPage /></AdminRoute>} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
