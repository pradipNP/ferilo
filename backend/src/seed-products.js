/**
 * Demo product seed — 15+ ACTIVE listings per category for search/filter testing.
 * Products are owned by the FERILO admin account so you can edit them while logged in.
 * Run: npm run db:seed-products -w backend
 */
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@ferilo.local';
const LEGACY_SEED_EMAIL = process.env.SEED_SELLER_EMAIL ?? 'seed@ferilo.local';
const PER_CATEGORY = Math.max(15, parseInt(process.env.SEED_PRODUCTS_PER_CATEGORY || '15', 10));

const CITIES = [
  { city: 'Bhairahawa', district: 'Rupandehi' },
  { city: 'Butwal', district: 'Rupandehi' },
  { city: 'Lumbini', district: 'Rupandehi' },
  { city: 'Tilottama', district: 'Rupandehi' },
  { city: 'Sainamaina', district: 'Rupandehi' },
  { city: 'Devdaha', district: 'Rupandehi' },
  { city: 'Taulihawa', district: 'Kapilvastu' },
  { city: 'Krishnanagar', district: 'Kapilvastu' },
  { city: 'Kapilvastu', district: 'Kapilvastu' },
];

const CONDITIONS = ['NEW_LIKE', 'GOOD', 'FAIR', 'POOR'];
const SIZE_TIERS = ['SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE'];

const PRODUCT_TEMPLATES = {
  electronics: [
    { title: 'Samsung Galaxy Buds Pro', brand: 'Samsung', price: 8500, condition: 'GOOD' },
    { title: 'Sony WH-1000XM4 Headphones', brand: 'Sony', price: 22000, condition: 'NEW_LIKE' },
    { title: 'JBL Bluetooth Speaker Flip 5', brand: 'JBL', price: 6500, condition: 'GOOD' },
    { title: 'Canon EOS 700D DSLR Camera', brand: 'Canon', price: 45000, condition: 'FAIR' },
    { title: 'GoPro Hero 9 Action Camera', brand: 'GoPro', price: 28000, condition: 'GOOD' },
    { title: 'Apple AirPods 2nd Generation', brand: 'Apple', price: 12000, condition: 'NEW_LIKE' },
    { title: 'Logitech MX Master 3 Mouse', brand: 'Logitech', price: 7500, condition: 'GOOD' },
    { title: 'Amazon Kindle Paperwhite', brand: 'Amazon', price: 14000, condition: 'GOOD' },
    { title: 'TP-Link WiFi Router Archer C6', brand: 'TP-Link', price: 3200, condition: 'NEW_LIKE' },
    { title: 'Philips Trimmer Series 3000', brand: 'Philips', price: 2800, condition: 'FAIR' },
    { title: 'Boat Rockerz 450 Headphones', brand: 'Boat', price: 1800, condition: 'GOOD' },
    { title: 'SanDisk 128GB USB Flash Drive', brand: 'SanDisk', price: 1500, condition: 'NEW_LIKE' },
    { title: 'Mi Smart Band 7', brand: 'Xiaomi', price: 4200, condition: 'GOOD' },
    { title: 'Anker Power Bank 20000mAh', brand: 'Anker', price: 3500, condition: 'GOOD' },
    { title: 'Wired Gaming Keyboard RGB', brand: 'Redragon', price: 4500, condition: 'FAIR' },
    { title: 'Bluetooth Earbuds TWS Pro', brand: 'Noise', price: 2200, condition: 'GOOD' },
  ],
  'mobile-phones': [
    { title: 'iPhone 13 128GB Blue', brand: 'Apple', price: 85000, condition: 'NEW_LIKE' },
    { title: 'Samsung Galaxy S21 5G', brand: 'Samsung', price: 42000, condition: 'GOOD' },
    { title: 'OnePlus Nord CE 2', brand: 'OnePlus', price: 28000, condition: 'GOOD' },
    { title: 'Redmi Note 12 Pro', brand: 'Xiaomi', price: 32000, condition: 'NEW_LIKE' },
    { title: 'iPhone 11 64GB Black', brand: 'Apple', price: 48000, condition: 'FAIR' },
    { title: 'Samsung Galaxy A54', brand: 'Samsung', price: 38000, condition: 'GOOD' },
    { title: 'Google Pixel 7a', brand: 'Google', price: 45000, condition: 'NEW_LIKE' },
    { title: 'Realme Narzo 60', brand: 'Realme', price: 22000, condition: 'GOOD' },
    { title: 'Vivo V27 5G', brand: 'Vivo', price: 35000, condition: 'GOOD' },
    { title: 'Oppo Reno 8', brand: 'Oppo', price: 40000, condition: 'FAIR' },
    { title: 'iPhone SE 2022', brand: 'Apple', price: 42000, condition: 'GOOD' },
    { title: 'Samsung Galaxy M34', brand: 'Samsung', price: 24000, condition: 'NEW_LIKE' },
    { title: 'Poco X5 Pro 5G', brand: 'Poco', price: 26000, condition: 'GOOD' },
    { title: 'Motorola Edge 40', brand: 'Motorola', price: 38000, condition: 'GOOD' },
    { title: 'Nokia G42 5G', brand: 'Nokia', price: 18000, condition: 'FAIR' },
    { title: 'Honor 90 Lite', brand: 'Honor', price: 29000, condition: 'GOOD' },
  ],
  laptops: [
    { title: 'MacBook Air M1 256GB', brand: 'Apple', price: 95000, condition: 'NEW_LIKE' },
    { title: 'Dell Inspiron 15 5518', brand: 'Dell', price: 62000, condition: 'GOOD' },
    { title: 'HP Pavilion 14 Ryzen 5', brand: 'HP', price: 55000, condition: 'GOOD' },
    { title: 'Lenovo IdeaPad Slim 3', brand: 'Lenovo', price: 48000, condition: 'FAIR' },
    { title: 'ASUS VivoBook 15', brand: 'ASUS', price: 52000, condition: 'GOOD' },
    { title: 'Acer Aspire 5 i5', brand: 'Acer', price: 58000, condition: 'GOOD' },
    { title: 'MacBook Pro 13 2020', brand: 'Apple', price: 110000, condition: 'GOOD' },
    { title: 'MSI Modern 14', brand: 'MSI', price: 72000, condition: 'NEW_LIKE' },
    { title: 'ThinkPad E14 Gen 3', brand: 'Lenovo', price: 68000, condition: 'GOOD' },
    { title: 'Huawei MateBook D15', brand: 'Huawei', price: 45000, condition: 'FAIR' },
    { title: 'Dell XPS 13 9310', brand: 'Dell', price: 125000, condition: 'NEW_LIKE' },
    { title: 'HP Victus Gaming Laptop', brand: 'HP', price: 98000, condition: 'GOOD' },
    { title: 'ASUS TUF Gaming F15', brand: 'ASUS', price: 89000, condition: 'GOOD' },
    { title: 'Surface Laptop Go 2', brand: 'Microsoft', price: 75000, condition: 'GOOD' },
    { title: 'Lenovo Legion 5', brand: 'Lenovo', price: 115000, condition: 'FAIR' },
    { title: 'MacBook Air 2019 i5', brand: 'Apple', price: 65000, condition: 'FAIR' },
  ],
  computers: [
    { title: 'Custom Gaming PC RTX 3060', brand: 'Custom', price: 95000, condition: 'GOOD' },
    { title: 'Dell OptiPlex Desktop i5', brand: 'Dell', price: 35000, condition: 'GOOD' },
    { title: 'HP All-in-One 24 Desktop', brand: 'HP', price: 48000, condition: 'FAIR' },
    { title: 'LG 27 inch Monitor 4K', brand: 'LG', price: 28000, condition: 'NEW_LIKE' },
    { title: 'Samsung 24 inch Curved Monitor', brand: 'Samsung', price: 22000, condition: 'GOOD' },
    { title: 'Intel NUC Mini PC', brand: 'Intel', price: 42000, condition: 'GOOD' },
    { title: 'Mechanical Keyboard Keychron K2', brand: 'Keychron', price: 8500, condition: 'NEW_LIKE' },
    { title: 'Logitech C920 Webcam', brand: 'Logitech', price: 6500, condition: 'GOOD' },
    { title: 'Seagate 2TB External HDD', brand: 'Seagate', price: 5500, condition: 'GOOD' },
    { title: 'WD 1TB NVMe SSD', brand: 'Western Digital', price: 8500, condition: 'NEW_LIKE' },
    { title: 'Corsair 16GB RAM DDR4', brand: 'Corsair', price: 4500, condition: 'GOOD' },
    { title: 'ASUS RTX 2060 Graphics Card', brand: 'ASUS', price: 32000, condition: 'FAIR' },
    { title: 'TP-Link PCIe WiFi Adapter', brand: 'TP-Link', price: 2200, condition: 'GOOD' },
    { title: 'UPS 650VA Power Backup', brand: 'APC', price: 7500, condition: 'GOOD' },
    { title: 'Printer Canon PIXMA G3010', brand: 'Canon', price: 18000, condition: 'FAIR' },
    { title: 'Dual Monitor Arm Mount', brand: 'Amazon Basics', price: 3500, condition: 'GOOD' },
  ],
  furniture: [
    { title: 'Wooden Study Table with Drawer', brand: null, price: 8500, condition: 'GOOD' },
    { title: 'Office Chair Ergonomic Mesh', brand: 'Featherlite', price: 12000, condition: 'GOOD' },
    { title: 'Two Seater Sofa Fabric Grey', brand: null, price: 28000, condition: 'FAIR' },
    { title: 'Queen Size Bed Frame Metal', brand: null, price: 18000, condition: 'GOOD' },
    { title: 'Bookshelf 5 Tier Wooden', brand: null, price: 6500, condition: 'GOOD' },
    { title: 'Dining Table Set 4 Chairs', brand: null, price: 22000, condition: 'FAIR' },
    { title: 'Computer Desk L-Shaped', brand: null, price: 14000, condition: 'NEW_LIKE' },
    { title: 'Wardrobe 2 Door Almirah', brand: null, price: 15000, condition: 'GOOD' },
    { title: 'Coffee Table Glass Top', brand: null, price: 7500, condition: 'GOOD' },
    { title: 'Mattress 6 inch Foam Single', brand: 'Kurlon', price: 9500, condition: 'GOOD' },
    { title: 'Plastic Chair Set of 4', brand: null, price: 3200, condition: 'FAIR' },
    { title: 'Shoe Rack 4 Layer', brand: null, price: 2800, condition: 'GOOD' },
    { title: 'TV Stand Wall Unit', brand: null, price: 11000, condition: 'GOOD' },
    { title: 'Folding Table Portable', brand: null, price: 4500, condition: 'NEW_LIKE' },
    { title: 'Bean Bag Large Navy Blue', brand: null, price: 3500, condition: 'FAIR' },
    { title: 'Kitchen Rack Steel 3 Tier', brand: null, price: 4200, condition: 'GOOD' },
  ],
  vehicles: [
    { title: 'Hero Splendor Plus 2021', brand: 'Hero', price: 85000, condition: 'GOOD' },
    { title: 'Honda Activa 6G Scooter', brand: 'Honda', price: 95000, condition: 'GOOD' },
    { title: 'Yamaha FZ-S V3 Bike', brand: 'Yamaha', price: 145000, condition: 'FAIR' },
    { title: 'TVS Apache RTR 160', brand: 'TVS', price: 120000, condition: 'GOOD' },
    { title: 'Bajaj Pulsar 150 NS', brand: 'Bajaj', price: 110000, condition: 'GOOD' },
    { title: 'Cycle Mountain Bike 21 Speed', brand: 'Firefox', price: 18000, condition: 'GOOD' },
    { title: 'Electric Scooter Ather 450X', brand: 'Ather', price: 95000, condition: 'NEW_LIKE' },
    { title: 'Royal Enfield Classic 350', brand: 'Royal Enfield', price: 185000, condition: 'GOOD' },
    { title: 'Suzuki Access 125 Scooter', brand: 'Suzuki', price: 78000, condition: 'FAIR' },
    { title: 'Kids Bicycle 20 inch', brand: null, price: 6500, condition: 'GOOD' },
    { title: 'Skateboard Pro Complete', brand: null, price: 4500, condition: 'GOOD' },
    { title: 'Helmet ISI Marked Full Face', brand: 'Studds', price: 2200, condition: 'NEW_LIKE' },
    { title: 'Car Tyre 185/65 R15 Set of 4', brand: 'MRF', price: 28000, condition: 'GOOD' },
    { title: 'Bike Chain Lube Kit', brand: null, price: 800, condition: 'GOOD' },
    { title: 'Scooter Cover Waterproof', brand: null, price: 1200, condition: 'FAIR' },
    { title: 'Bicycle Lock U-Lock Heavy', brand: null, price: 1500, condition: 'GOOD' },
  ],
  books: [
    { title: 'The Alchemist Paulo Coelho', brand: null, price: 350, condition: 'GOOD' },
    { title: 'Atomic Habits James Clear', brand: null, price: 650, condition: 'NEW_LIKE' },
    { title: 'Rich Dad Poor Dad', brand: null, price: 450, condition: 'GOOD' },
    { title: 'Ikigai Japanese Life Philosophy', brand: null, price: 500, condition: 'GOOD' },
    { title: 'Nepali Novel Karnali Blues', brand: null, price: 400, condition: 'FAIR' },
    { title: 'Harry Potter Complete Set', brand: null, price: 4500, condition: 'GOOD' },
    { title: 'NCERT Physics Class 12', brand: 'NCERT', price: 280, condition: 'FAIR' },
    { title: 'Word Power Made Easy', brand: null, price: 320, condition: 'GOOD' },
    { title: 'Sapiens Yuval Noah Harari', brand: null, price: 550, condition: 'GOOD' },
    { title: 'Bhagavad Gita Nepali Translation', brand: null, price: 250, condition: 'GOOD' },
    { title: 'Comics Naruto Volume Set', brand: null, price: 2800, condition: 'GOOD' },
    { title: 'Medical Entrance Prep Book', brand: null, price: 1200, condition: 'FAIR' },
    { title: 'Coding Interview Handbook', brand: null, price: 800, condition: 'GOOD' },
    { title: 'Nepali Dictionary Hardcover', brand: null, price: 600, condition: 'GOOD' },
    { title: 'Children Story Books Bundle', brand: null, price: 900, condition: 'GOOD' },
    { title: 'IELTS Cambridge Book 17', brand: 'Cambridge', price: 1500, condition: 'NEW_LIKE' },
  ],
  clothing: [
    { title: 'North Face Jacket Winter', brand: 'North Face', price: 8500, condition: 'GOOD' },
    { title: 'Nike Air Max Sneakers Size 42', brand: 'Nike', price: 6500, condition: 'GOOD' },
    { title: 'Levis 501 Jeans Original', brand: 'Levis', price: 3200, condition: 'FAIR' },
    { title: 'Adidas Track Suit Set', brand: 'Adidas', price: 4500, condition: 'GOOD' },
    { title: 'Pashmina Shawl Handwoven', brand: null, price: 5500, condition: 'NEW_LIKE' },
    { title: 'Formal Shirt Van Heusen', brand: 'Van Heusen', price: 1800, condition: 'GOOD' },
    { title: 'Saree Banarasi Silk', brand: null, price: 12000, condition: 'GOOD' },
    { title: 'Winter Sweater Wool Unisex', brand: null, price: 2200, condition: 'GOOD' },
    { title: 'Hiking Boots Size 41', brand: 'Columbia', price: 7500, condition: 'FAIR' },
    { title: 'School Uniform Set Size M', brand: null, price: 1500, condition: 'GOOD' },
    { title: 'Ray-Ban Sunglasses Aviator', brand: 'Ray-Ban', price: 4500, condition: 'GOOD' },
    { title: 'Kurta Set Traditional Cotton', brand: null, price: 2800, condition: 'NEW_LIKE' },
    { title: 'Sports T-Shirt Dry Fit Pack of 3', brand: 'Puma', price: 2400, condition: 'GOOD' },
    { title: 'Leather Belt Formal Brown', brand: null, price: 800, condition: 'GOOD' },
    { title: 'Down Jacket Uniqlo Ultra Light', brand: 'Uniqlo', price: 9500, condition: 'GOOD' },
    { title: 'Canvas Shoes Converse Style', brand: null, price: 1800, condition: 'FAIR' },
  ],
  appliances: [
    { title: 'Samsung 7kg Washing Machine', brand: 'Samsung', price: 28000, condition: 'GOOD' },
    { title: 'LG 260L Double Door Fridge', brand: 'LG', price: 35000, condition: 'GOOD' },
    { title: 'Baltra Electric Kettle 1.8L', brand: 'Baltra', price: 1200, condition: 'NEW_LIKE' },
    { title: 'Philips Air Fryer HD9200', brand: 'Philips', price: 8500, condition: 'GOOD' },
    { title: 'Panasonic Microwave 23L', brand: 'Panasonic', price: 12000, condition: 'FAIR' },
    { title: 'CG Instant Water Heater 3L', brand: 'CG', price: 6500, condition: 'GOOD' },
    { title: 'Orient Wall Fan 400mm', brand: 'Orient', price: 2800, condition: 'GOOD' },
    { title: 'Preethi Mixer Grinder 750W', brand: 'Preethi', price: 5500, condition: 'GOOD' },
    { title: 'Daikin 1 Ton Split AC', brand: 'Daikin', price: 45000, condition: 'GOOD' },
    { title: 'Voltas Desert Cooler', brand: 'Voltas', price: 8500, condition: 'FAIR' },
    { title: 'Iron Philips Steam 2400W', brand: 'Philips', price: 3200, condition: 'GOOD' },
    { title: 'Rice Cooker Panasonic 2.2L', brand: 'Panasonic', price: 4500, condition: 'NEW_LIKE' },
    { title: 'Vacuum Cleaner Karcher', brand: 'Karcher', price: 15000, condition: 'GOOD' },
    { title: 'Induction Cooktop Prestige', brand: 'Prestige', price: 2800, condition: 'GOOD' },
    { title: 'Room Heater Bajaj Majesty', brand: 'Bajaj', price: 3500, condition: 'FAIR' },
    { title: 'Water Purifier Kent RO', brand: 'Kent', price: 18000, condition: 'GOOD' },
  ],
  sports: [
    { title: 'Cricket Bat Kashmir Willow', brand: 'SS', price: 3500, condition: 'GOOD' },
    { title: 'Football Nike Strike Size 5', brand: 'Nike', price: 2200, condition: 'GOOD' },
    { title: 'Badminton Racket Yonex Nanoray', brand: 'Yonex', price: 4500, condition: 'NEW_LIKE' },
    { title: 'Yoga Mat 6mm Anti Slip', brand: null, price: 1200, condition: 'GOOD' },
    { title: 'Dumbbell Set 10kg Pair', brand: null, price: 5500, condition: 'GOOD' },
    { title: 'Treadmill Manual Foldable', brand: 'Powermax', price: 28000, condition: 'FAIR' },
    { title: 'Basketball Spalding Official', brand: 'Spalding', price: 2800, condition: 'GOOD' },
    { title: 'Swimming Goggles Speedo', brand: 'Speedo', price: 1500, condition: 'GOOD' },
    { title: 'Table Tennis Bat Stiga', brand: 'Stiga', price: 3200, condition: 'GOOD' },
    { title: 'Cricket Kit Bag Full Size', brand: null, price: 2800, condition: 'FAIR' },
    { title: 'Skipping Rope Adjustable', brand: null, price: 450, condition: 'NEW_LIKE' },
    { title: 'Camping Tent 2 Person', brand: null, price: 8500, condition: 'GOOD' },
    { title: 'Protein Shaker Bottle 700ml', brand: null, price: 350, condition: 'GOOD' },
    { title: 'Resistance Bands Set of 5', brand: null, price: 1200, condition: 'GOOD' },
    { title: 'Volleyball Mikasa Official', brand: 'Mikasa', price: 2500, condition: 'GOOD' },
    { title: 'Boxing Gloves 12oz Pair', brand: null, price: 4500, condition: 'FAIR' },
  ],
  'musical-instruments': [
    { title: 'Yamaha F310 Acoustic Guitar', brand: 'Yamaha', price: 12000, condition: 'GOOD' },
    { title: 'Casio CT-S200 Keyboard', brand: 'Casio', price: 15000, condition: 'GOOD' },
    { title: 'Dholak Traditional Nepali', brand: null, price: 4500, condition: 'FAIR' },
    { title: 'Violin 4/4 Full Size', brand: null, price: 8500, condition: 'GOOD' },
    { title: 'Tabla Set Professional', brand: null, price: 12000, condition: 'GOOD' },
    { title: 'Ukulele Soprano Mahogany', brand: null, price: 3500, condition: 'NEW_LIKE' },
    { title: 'Harmonium 9 Stop Reeds', brand: null, price: 18000, condition: 'GOOD' },
    { title: 'Flute Bamboo Professional', brand: null, price: 800, condition: 'GOOD' },
    { title: 'DJ Controller Pioneer DDJ', brand: 'Pioneer', price: 45000, condition: 'GOOD' },
    { title: 'Microphone Shure SM58', brand: 'Shure', price: 15000, condition: 'NEW_LIKE' },
    { title: 'Madan Baja Nepali Folk', brand: null, price: 6500, condition: 'GOOD' },
    { title: 'Electric Guitar Squier Bullet', brand: 'Squier', price: 18000, condition: 'FAIR' },
    { title: 'Drum Practice Pad Set', brand: null, price: 4500, condition: 'GOOD' },
    { title: 'Sitar Beginner Model', brand: null, price: 22000, condition: 'GOOD' },
    { title: 'Amplifier 15W Guitar', brand: 'Blackstar', price: 9500, condition: 'GOOD' },
    { title: 'Sarangi Traditional String', brand: null, price: 35000, condition: 'FAIR' },
  ],
  'home-garden': [
    { title: 'Indoor Plant Monstera Large', brand: null, price: 2500, condition: 'GOOD' },
    { title: 'Garden Hose 30m with Spray', brand: null, price: 1800, condition: 'GOOD' },
    { title: 'Pressure Cooker Prestige 5L', brand: 'Prestige', price: 2200, condition: 'GOOD' },
    { title: 'Non Stick Cookware Set 5pc', brand: 'Pigeon', price: 3500, condition: 'NEW_LIKE' },
    { title: 'Vacuum Flask Set 1L', brand: 'Milton', price: 1200, condition: 'GOOD' },
    { title: 'LED Garden Lights Solar', brand: null, price: 2800, condition: 'GOOD' },
    { title: 'Tool Kit 46 Piece Home', brand: null, price: 4500, condition: 'GOOD' },
    { title: 'Ceramic Flower Pots Set of 6', brand: null, price: 1500, condition: 'FAIR' },
    { title: 'Watering Can 10L Plastic', brand: null, price: 650, condition: 'GOOD' },
    { title: 'Dining Cutlery Set 24pc', brand: null, price: 2800, condition: 'GOOD' },
    { title: 'Compost Bin Kitchen Counter', brand: null, price: 2200, condition: 'NEW_LIKE' },
    { title: 'Wall Clock Silent Sweep', brand: null, price: 1200, condition: 'GOOD' },
    { title: 'Curtain Set 2 Panels Beige', brand: null, price: 3500, condition: 'GOOD' },
    { title: 'Doormat Anti Slip Large', brand: null, price: 800, condition: 'GOOD' },
    { title: 'Lawn Mower Manual Push', brand: null, price: 8500, condition: 'FAIR' },
    { title: 'Storage Boxes Set of 4', brand: null, price: 1800, condition: 'GOOD' },
  ],
  education: [
    { title: 'Scientific Calculator Casio fx-991', brand: 'Casio', price: 2200, condition: 'GOOD' },
    { title: 'Engineering Drawing Kit Complete', brand: null, price: 1500, condition: 'GOOD' },
    { title: 'Whiteboard 3x2 ft with Stand', brand: null, price: 4500, condition: 'FAIR' },
    { title: 'Laptop Stand Adjustable Aluminium', brand: null, price: 2800, condition: 'NEW_LIKE' },
    { title: 'Stationery Bundle College Pack', brand: null, price: 800, condition: 'GOOD' },
    { title: 'Globe Educational 30cm', brand: null, price: 1200, condition: 'GOOD' },
    { title: 'Microscope Student 100x', brand: null, price: 6500, condition: 'GOOD' },
    { title: 'Projector Epson EB-S41', brand: 'Epson', price: 45000, condition: 'GOOD' },
    { title: 'Lab Coat White Size L', brand: null, price: 800, condition: 'GOOD' },
    { title: 'Geometry Box Compass Set', brand: null, price: 350, condition: 'NEW_LIKE' },
    { title: 'USB Document Camera', brand: null, price: 8500, condition: 'GOOD' },
    { title: 'Nepali Typing Practice Book', brand: null, price: 280, condition: 'GOOD' },
    { title: 'Backpack Laptop 15.6 inch', brand: 'American Tourister', price: 3500, condition: 'GOOD' },
    { title: 'Flash Cards English Vocabulary', brand: null, price: 450, condition: 'GOOD' },
    { title: 'Art Supply Kit 48 Colors', brand: null, price: 2200, condition: 'FAIR' },
    { title: 'Periodic Table Wall Chart', brand: null, price: 250, condition: 'GOOD' },
  ],
  other: [
    { title: 'Baby Stroller 3 Wheel Jogger', brand: null, price: 12000, condition: 'GOOD' },
    { title: 'Pet Dog Cage Medium Size', brand: null, price: 5500, condition: 'GOOD' },
    { title: 'Board Game Monopoly Classic', brand: 'Hasbro', price: 2200, condition: 'GOOD' },
    { title: 'Suitcase 28 inch Hard Shell', brand: 'Safari', price: 8500, condition: 'NEW_LIKE' },
    { title: 'Wall Art Canvas Nepal Landscape', brand: null, price: 3500, condition: 'GOOD' },
    { title: 'Vintage Film Camera Olympus', brand: 'Olympus', price: 6500, condition: 'FAIR' },
    { title: 'Handmade Nepali Handicraft Vase', brand: null, price: 2800, condition: 'GOOD' },
    { title: 'Toy Car Remote Control', brand: null, price: 1800, condition: 'GOOD' },
    { title: 'Wedding Decor Lights String', brand: null, price: 1200, condition: 'GOOD' },
    { title: 'Antique Brass Bell Temple', brand: null, price: 4500, condition: 'FAIR' },
    { title: 'Collectible Coin Set Nepal', brand: null, price: 3500, condition: 'GOOD' },
    { title: 'Tool Box Metal Large', brand: null, price: 2800, condition: 'GOOD' },
    { title: 'Picnic Basket Wicker 4 Person', brand: null, price: 2200, condition: 'GOOD' },
    { title: 'Safety Helmet Construction', brand: null, price: 1200, condition: 'NEW_LIKE' },
    { title: 'Fishing Rod and Reel Combo', brand: null, price: 4500, condition: 'GOOD' },
    { title: 'Misc Household Items Bundle', brand: null, price: 1500, condition: 'FAIR' },
  ],
};

function buildDescription(title, categoryName, city) {
  return (
    `Well-maintained ${title} listed on FERILO in the ${categoryName} category. ` +
    `Located in ${city}. Ideal for buyers looking for verified second-hand deals in Nepal. ` +
    `Item has been checked and described honestly. Meet-up or delivery available within the valley. ` +
    `Contact seller through FERILO for more photos or questions.`
  );
}

async function ensureAdminSeller(client) {
  const { rows } = await client.query(
    `SELECT id FROM users WHERE email = $1 AND role = 'ADMIN'`,
    [ADMIN_EMAIL],
  );
  if (!rows.length) {
    throw new Error(
      `Admin user ${ADMIN_EMAIL} not found. Run npm run db:seed first, then retry.`,
    );
  }

  await client.query(
    `INSERT INTO user_profiles (user_id, display_name, city, district)
     VALUES ($1, 'FERILO Admin', 'Bhairahawa', 'Rupandehi')
     ON CONFLICT (user_id) DO UPDATE SET display_name = 'FERILO Admin'`,
    [rows[0].id],
  );

  return rows[0].id;
}

async function clearPreviousSeedListings(client, adminId) {
  // Remove prior demo inventory owned by admin (seeded descriptions only).
  await client.query(
    `DELETE FROM products
     WHERE seller_id = $1
       AND description LIKE 'Well-maintained % listed on FERILO in the %'`,
    [adminId],
  );

  // Also clear leftover Demo Seller inventory from older seeds.
  await client.query(
    `DELETE FROM products
     WHERE seller_id IN (SELECT id FROM users WHERE email = $1)`,
    [LEGACY_SEED_EMAIL],
  );
}

async function seedProducts() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const sellerId = await ensureAdminSeller(client);
    await clearPreviousSeedListings(client, sellerId);

    const { rows: categories } = await client.query(
      `SELECT id, name, slug FROM categories WHERE is_active = true ORDER BY sort_order`,
    );

    let totalInserted = 0;

    for (const category of categories) {
      const templates = PRODUCT_TEMPLATES[category.slug];
      if (!templates) {
        console.warn(`No templates for category: ${category.slug}`);
        continue;
      }

      const items = templates.slice(0, PER_CATEGORY);
      for (let i = 0; i < PER_CATEGORY; i++) {
        const template = items[i % items.length];
        const location = CITIES[i % CITIES.length];
        const condition = template.condition || CONDITIONS[i % CONDITIONS.length];
        const price = template.price + (i % 5) * 250;
        const sizeTier = SIZE_TIERS[i % SIZE_TIERS.length];
        const publishedDaysAgo = i + (category.id * 2);
        const isSubcategory = ['mobile-phones', 'laptops', 'computers'].includes(category.slug);

        await client.query(
          `INSERT INTO products (
            seller_id, category_id, subcategory_id, title, description, condition, price,
            is_negotiable, brand, delivery_size_tier, delivery_eligible, requires_trolley,
            meetup_available, city, district, status, published_at, view_count
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'ACTIVE', NOW() - ($16 || ' days')::interval, $17)`,
          [
            sellerId,
            isSubcategory ? 1 : category.id,
            isSubcategory ? category.id : null,
            template.title,
            buildDescription(template.title, category.name, location.city),
            condition,
            price,
            i % 3 !== 0,
            template.brand,
            sizeTier,
            true,
            sizeTier === 'LARGE' || sizeTier === 'EXTRA_LARGE',
            true,
            location.city,
            location.district,
            publishedDaysAgo,
            Math.floor(Math.random() * 120),
          ],
        );
        totalInserted++;
      }
    }

    await client.query('COMMIT');
    console.log(`Seeded ${totalInserted} ACTIVE products (${PER_CATEGORY} per category, ${categories.length} categories).`);
    console.log(`Seller: ${ADMIN_EMAIL} (FERILO Admin) — log in as admin to manage these listings.`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

seedProducts()
  .then(() => pool.end())
  .catch((err) => {
    console.error('Product seed failed:', err.message || err);
    pool.end();
    process.exit(1);
  });
