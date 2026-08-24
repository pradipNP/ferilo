INSERT INTO delivery_zones (name, city)
SELECT v.name, v.city FROM (VALUES
  ('Bhairahawa', 'Bhairahawa'),
  ('Butwal', 'Butwal'),
  ('Lumbini', 'Lumbini'),
  ('Tilottama', 'Tilottama'),
  ('Taulihawa', 'Taulihawa')
) AS v(name, city)
WHERE NOT EXISTS (SELECT 1 FROM delivery_zones dz WHERE dz.city = v.city);

INSERT INTO delivery_rates (zone_id, size_tier, base_charge, per_km_charge, max_distance_km, trolley_charge)
SELECT z.id, tier.size_tier, tier.base_charge, tier.per_km_charge, tier.max_distance_km, tier.trolley_charge
FROM delivery_zones z
CROSS JOIN (VALUES
  ('SMALL', 80.00, 12.00, 60.00, 0.00),
  ('MEDIUM', 120.00, 16.00, 50.00, 250.00),
  ('LARGE', 200.00, 20.00, 40.00, 400.00),
  ('EXTRA_LARGE', 350.00, 25.00, 35.00, 700.00)
) AS tier(size_tier, base_charge, per_km_charge, max_distance_km, trolley_charge)
WHERE z.city IN ('Bhairahawa', 'Butwal', 'Lumbini', 'Tilottama', 'Taulihawa')
  AND NOT EXISTS (
    SELECT 1 FROM delivery_rates dr
    WHERE dr.zone_id = z.id AND dr.size_tier = tier.size_tier AND dr.effective_to IS NULL
  );

INSERT INTO city_distances (from_city, to_city, distance_km) VALUES
  ('Bhairahawa', 'Bhairahawa', 0),
  ('Bhairahawa', 'Butwal', 22),
  ('Bhairahawa', 'Lumbini', 22),
  ('Bhairahawa', 'Tilottama', 18),
  ('Bhairahawa', 'Sainamaina', 28),
  ('Bhairahawa', 'Devdaha', 25),
  ('Bhairahawa', 'Taulihawa', 25),
  ('Bhairahawa', 'Krishnanagar', 35),
  ('Bhairahawa', 'Kapilvastu', 27),
  ('Butwal', 'Butwal', 0),
  ('Butwal', 'Bhairahawa', 22),
  ('Butwal', 'Lumbini', 30),
  ('Butwal', 'Tilottama', 8),
  ('Butwal', 'Sainamaina', 12),
  ('Butwal', 'Devdaha', 15),
  ('Butwal', 'Taulihawa', 40),
  ('Butwal', 'Krishnanagar', 48),
  ('Butwal', 'Kapilvastu', 42),
  ('Lumbini', 'Lumbini', 0),
  ('Lumbini', 'Bhairahawa', 22),
  ('Lumbini', 'Butwal', 30),
  ('Lumbini', 'Tilottama', 25),
  ('Lumbini', 'Taulihawa', 28),
  ('Tilottama', 'Tilottama', 0),
  ('Tilottama', 'Butwal', 8),
  ('Tilottama', 'Bhairahawa', 18),
  ('Sainamaina', 'Sainamaina', 0),
  ('Sainamaina', 'Butwal', 12),
  ('Devdaha', 'Devdaha', 0),
  ('Devdaha', 'Butwal', 15),
  ('Taulihawa', 'Taulihawa', 0),
  ('Taulihawa', 'Bhairahawa', 25),
  ('Taulihawa', 'Kapilvastu', 5),
  ('Taulihawa', 'Krishnanagar', 18),
  ('Krishnanagar', 'Krishnanagar', 0),
  ('Krishnanagar', 'Taulihawa', 18),
  ('Kapilvastu', 'Kapilvastu', 0),
  ('Kapilvastu', 'Taulihawa', 5),
  ('Kapilvastu', 'Bhairahawa', 27)
ON CONFLICT (from_city, to_city) DO NOTHING;

-- Remap existing Kathmandu-valley demo inventory to Rupandehi / Kapilvastu hubs
UPDATE products SET city = 'Bhairahawa', district = 'Rupandehi', updated_at = NOW()
WHERE city IN ('Kathmandu', 'Bhaktapur');

UPDATE products SET city = 'Butwal', district = 'Rupandehi', updated_at = NOW()
WHERE city IN ('Lalitpur', 'Pokhara');

UPDATE products SET city = 'Lumbini', district = 'Rupandehi', updated_at = NOW()
WHERE city IN ('Biratnagar');

UPDATE user_profiles SET city = 'Bhairahawa', district = 'Rupandehi'
WHERE city IN ('Kathmandu', 'Lalitpur', 'Bhaktapur', 'Pokhara') OR city IS NULL;
