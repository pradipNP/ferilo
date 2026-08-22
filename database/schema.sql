-- FERILO initial schema (Phase 2)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- ─── Users ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email CITEXT UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN')),
  verification_status VARCHAR(30) NOT NULL DEFAULT 'UNVERIFIED'
    CHECK (verification_status IN ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED')),
  account_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
    CHECK (account_status IN ('ACTIVE', 'SUSPENDED', 'DELETED')),
  email_verified_at TIMESTAMPTZ,
  failed_login_attempts SMALLINT NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  token_version INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_verification_status ON users (verification_status);
CREATE INDEX IF NOT EXISTS idx_users_account_status ON users (account_status);

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  display_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  avatar_url TEXT,
  city VARCHAR(100),
  district VARCHAR(100),
  bio TEXT,
  buyer_rating_avg NUMERIC(3, 2) NOT NULL DEFAULT 0 CHECK (buyer_rating_avg >= 0 AND buyer_rating_avg <= 5),
  seller_rating_avg NUMERIC(3, 2) NOT NULL DEFAULT 0 CHECK (seller_rating_avg >= 0 AND seller_rating_avg <= 5),
  total_sales INTEGER NOT NULL DEFAULT 0,
  total_purchases INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Identity verification (metadata only — files stored privately) ───
CREATE TABLE IF NOT EXISTS identity_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'RESUBMISSION_REQUIRED')),
  document_type VARCHAR(30) NOT NULL CHECK (document_type IN ('CITIZENSHIP', 'PASSPORT', 'DRIVING_LICENSE')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users (id) ON DELETE SET NULL,
  rejection_reason TEXT,
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_identity_verifications_queue ON identity_verifications (status, submitted_at);

CREATE TABLE IF NOT EXISTS verification_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_id UUID NOT NULL REFERENCES identity_verifications (id) ON DELETE CASCADE,
  storage_key VARCHAR(512) NOT NULL,
  file_hash VARCHAR(64) NOT NULL,
  mime_type VARCHAR(50) NOT NULL,
  file_size_bytes INTEGER NOT NULL CHECK (file_size_bytes > 0),
  side VARCHAR(10) NOT NULL CHECK (side IN ('FRONT', 'BACK', 'SELFIE')),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Categories ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  parent_id INTEGER REFERENCES categories (id) ON DELETE SET NULL,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(120) UNIQUE NOT NULL,
  icon VARCHAR(50),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_parent_name ON categories (parent_id, name);

-- ─── Products ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories (id),
  subcategory_id INTEGER REFERENCES categories (id) ON DELETE SET NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  condition VARCHAR(20) NOT NULL CHECK (condition IN ('NEW_LIKE', 'GOOD', 'FAIR', 'POOR')),
  price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'NPR',
  is_negotiable BOOLEAN NOT NULL DEFAULT TRUE,
  brand VARCHAR(100),
  model VARCHAR(100),
  purchase_year SMALLINT CHECK (purchase_year IS NULL OR purchase_year BETWEEN 1970 AND 2100),
  weight_kg NUMERIC(8, 2) CHECK (weight_kg IS NULL OR weight_kg >= 0),
  dimensions_cm JSONB,
  delivery_size_tier VARCHAR(20) NOT NULL DEFAULT 'SMALL'
    CHECK (delivery_size_tier IN ('SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE')),
  delivery_eligible BOOLEAN NOT NULL DEFAULT TRUE,
  requires_trolley BOOLEAN NOT NULL DEFAULT FALSE,
  meetup_available BOOLEAN NOT NULL DEFAULT TRUE,
  city VARCHAR(100) NOT NULL,
  district VARCHAR(100) NOT NULL,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'RESERVED', 'SOLD', 'EXPIRED', 'REJECTED', 'REMOVED')),
  rejection_reason TEXT,
  view_count INTEGER NOT NULL DEFAULT 0,
  published_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_status_published ON products (status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category_id, status);
CREATE INDEX IF NOT EXISTS idx_products_seller ON products (seller_id);
CREATE INDEX IF NOT EXISTS idx_products_location ON products (city, district);
CREATE INDEX IF NOT EXISTS idx_products_price ON products (price);
CREATE INDEX IF NOT EXISTS idx_products_search ON products
  USING GIN (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '')));

CREATE TABLE IF NOT EXISTS product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  storage_key VARCHAR(512) NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_images_one_primary
  ON product_images (product_id) WHERE is_primary = TRUE;

-- ─── Favorites ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS favorites (
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, product_id)
);

-- ─── Offers ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  message TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'COUNTERED', 'EXPIRED', 'CANCELLED')),
  parent_offer_id UUID REFERENCES offers (id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offers_product_status ON offers (product_id, status);
CREATE INDEX IF NOT EXISTS idx_offers_buyer ON offers (buyer_id);
CREATE INDEX IF NOT EXISTS idx_offers_seller ON offers (seller_id);

-- ─── Messaging ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversation_participants (
  conversation_id UUID NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ,
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages (conversation_id, created_at);

-- ─── Orders ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(20) UNIQUE NOT NULL,
  buyer_id UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  seller_id UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  product_id UUID NOT NULL REFERENCES products (id) ON DELETE RESTRICT,
  offer_id UUID REFERENCES offers (id) ON DELETE SET NULL,
  fulfillment_type VARCHAR(20) NOT NULL CHECK (fulfillment_type IN ('MEETUP', 'DELIVERY')),
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN (
      'PENDING', 'CONFIRMED', 'READY_FOR_MEETUP', 'READY_FOR_DELIVERY',
      'IN_TRANSIT', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'DISPUTED'
    )),
  product_price NUMERIC(12, 2) NOT NULL CHECK (product_price >= 0),
  delivery_charge NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (delivery_charge >= 0),
  trolley_charge NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (trolley_charge >= 0),
  service_fee NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (service_fee >= 0),
  total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'NPR',
  meetup_location_note TEXT,
  delivery_address JSONB,
  distance_km NUMERIC(8, 2) CHECK (distance_km IS NULL OR distance_km >= 0),
  buyer_confirmed_at TIMESTAMPTZ,
  seller_confirmed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders (buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_seller ON orders (seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);

CREATE TABLE IF NOT EXISTS order_status_history (
  id BIGSERIAL PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  from_status VARCHAR(30),
  to_status VARCHAR(30) NOT NULL,
  changed_by UUID REFERENCES users (id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Delivery configuration ────────────────────────────────
CREATE TABLE IF NOT EXISTS delivery_zones (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  city VARCHAR(100) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_rates (
  id SERIAL PRIMARY KEY,
  zone_id INTEGER NOT NULL REFERENCES delivery_zones (id) ON DELETE CASCADE,
  size_tier VARCHAR(20) NOT NULL CHECK (size_tier IN ('SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE')),
  base_charge NUMERIC(10, 2) NOT NULL CHECK (base_charge >= 0),
  per_km_charge NUMERIC(10, 2) NOT NULL CHECK (per_km_charge >= 0),
  max_distance_km NUMERIC(6, 2) NOT NULL CHECK (max_distance_km > 0),
  trolley_charge NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (trolley_charge >= 0),
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_delivery_rates_active
  ON delivery_rates (zone_id, size_tier) WHERE effective_to IS NULL;

CREATE TABLE IF NOT EXISTS delivery_rules (
  id SERIAL PRIMARY KEY,
  rule_key VARCHAR(50) UNIQUE NOT NULL,
  rule_value NUMERIC(10, 2) NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS city_distances (
  id SERIAL PRIMARY KEY,
  from_city VARCHAR(100) NOT NULL,
  to_city VARCHAR(100) NOT NULL,
  distance_km NUMERIC(8, 2) NOT NULL CHECK (distance_km >= 0),
  UNIQUE (from_city, to_city)
);

-- ─── Reviews ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  reviewer_role VARCHAR(10) NOT NULL CHECK (reviewer_role IN ('BUYER', 'SELLER')),
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (order_id, reviewer_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON reviews (reviewee_id, created_at DESC);

-- ─── Reports & notifications ─────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('USER', 'PRODUCT', 'MESSAGE', 'ORDER')),
  target_id UUID NOT NULL,
  category VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN'
    CHECK (status IN ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED')),
  admin_notes TEXT,
  resolved_by UUID REFERENCES users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON reports (status, created_at DESC);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  payload JSONB,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id, is_read, created_at DESC);

-- ─── Auth tokens & blocks ────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens (user_id);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_blocks (
  blocker_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

-- ─── Audit log ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_id UUID REFERENCES users (id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  metadata JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs (created_at DESC);

-- ─── Updated_at trigger ──────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER trg_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_products_updated_at ON products;
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_offers_updated_at ON offers;
CREATE TRIGGER trg_offers_updated_at BEFORE UPDATE ON offers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_orders_updated_at ON orders;
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
