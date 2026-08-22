-- FERILO seed data (Phase 2) — admin user is inserted by db.js

INSERT INTO categories (name, slug, icon, sort_order) VALUES
  ('Electronics', 'electronics', '📱', 1),
  ('Mobile Phones', 'mobile-phones', '📱', 2),
  ('Laptops', 'laptops', '💻', 3),
  ('Computers', 'computers', '🖥', 4),
  ('Furniture', 'furniture', '🛋', 5),
  ('Vehicles', 'vehicles', '🚗', 6),
  ('Books', 'books', '📚', 7),
  ('Clothing', 'clothing', '👕', 8),
  ('Appliances', 'appliances', '🔌', 9),
  ('Sports', 'sports', '⚽', 10),
  ('Musical Instruments', 'musical-instruments', '🎸', 11),
  ('Home & Garden', 'home-garden', '🏡', 12),
  ('Education', 'education', '🎓', 13),
  ('Other', 'other', '📦', 14)
ON CONFLICT (slug) DO NOTHING;

UPDATE categories SET parent_id = (SELECT id FROM categories WHERE slug = 'electronics')
WHERE slug IN ('mobile-phones', 'laptops', 'computers');

INSERT INTO delivery_zones (name, city)
SELECT v.name, v.city FROM (VALUES
  ('Kathmandu Valley', 'Kathmandu'),
  ('Pokhara', 'Pokhara'),
  ('Lalitpur', 'Lalitpur'),
  ('Bhaktapur', 'Bhaktapur')
) AS v(name, city)
WHERE NOT EXISTS (SELECT 1 FROM delivery_zones dz WHERE dz.city = v.city);

INSERT INTO delivery_rates (zone_id, size_tier, base_charge, per_km_charge, max_distance_km, trolley_charge)
SELECT z.id, tier.size_tier, tier.base_charge, tier.per_km_charge, tier.max_distance_km, tier.trolley_charge
FROM delivery_zones z
CROSS JOIN (VALUES
  ('SMALL', 100.00, 15.00, 50.00, 0.00),
  ('MEDIUM', 150.00, 20.00, 40.00, 300.00),
  ('LARGE', 250.00, 25.00, 30.00, 500.00),
  ('EXTRA_LARGE', 400.00, 30.00, 25.00, 800.00)
) AS tier(size_tier, base_charge, per_km_charge, max_distance_km, trolley_charge)
WHERE z.city = 'Kathmandu'
  AND NOT EXISTS (
    SELECT 1 FROM delivery_rates dr
    WHERE dr.zone_id = z.id AND dr.size_tier = tier.size_tier AND dr.effective_to IS NULL
  );

INSERT INTO delivery_rules (rule_key, rule_value, description) VALUES
  ('min_delivery_charge', 100.00, 'Minimum delivery charge in NPR'),
  ('max_delivery_charge', 5000.00, 'Maximum delivery charge in NPR'),
  ('meetup_charge', 0.00, 'Meetup has zero delivery fee')
ON CONFLICT (rule_key) DO NOTHING;

INSERT INTO city_distances (from_city, to_city, distance_km) VALUES
  ('Kathmandu', 'Kathmandu', 0),
  ('Kathmandu', 'Lalitpur', 5),
  ('Kathmandu', 'Bhaktapur', 12),
  ('Kathmandu', 'Pokhara', 200),
  ('Lalitpur', 'Kathmandu', 5),
  ('Lalitpur', 'Lalitpur', 0),
  ('Lalitpur', 'Bhaktapur', 15),
  ('Bhaktapur', 'Kathmandu', 12),
  ('Bhaktapur', 'Lalitpur', 15),
  ('Bhaktapur', 'Bhaktapur', 0),
  ('Pokhara', 'Kathmandu', 200),
  ('Pokhara', 'Pokhara', 0)
ON CONFLICT (from_city, to_city) DO NOTHING;
