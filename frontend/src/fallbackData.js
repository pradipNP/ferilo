/**
 * Portfolio offline backup data.
 * Used when Neon/Render/API is asleep, slow, or unreachable.
 * Live responses always win when the backend responds successfully.
 */

const img = (seed, w = 800, h = 600) =>
  `https://picsum.photos/seed/ferilo-${seed}/${w}/${h}`;

export const FALLBACK_CATEGORIES = [
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

export const FALLBACK_DEMO_USER = {
  id: 'fb-user-demo',
  email: 'demo@ferilo.local',
  displayName: 'Demo Buyer',
  role: 'USER',
  verificationStatus: 'VERIFIED',
  phone: '9800000001',
  city: 'Butwal',
  district: 'Rupandehi',
  bio: 'Portfolio demo buyer account (offline preview).',
};

export const FALLBACK_ADMIN_USER = {
  id: 'fb-user-admin',
  email: 'admin@ferilo.local',
  displayName: 'FERILO Admin',
  role: 'ADMIN',
  verificationStatus: 'VERIFIED',
  phone: '9800000000',
  city: 'Bhairahawa',
  district: 'Rupandehi',
  bio: 'Portfolio demo admin (offline preview).',
};

export const FALLBACK_SELLERS = [
  {
    id: 'fb-seller-1',
    displayName: 'Sita Thapa',
    verificationStatus: 'VERIFIED',
    sellerRatingAvg: 4.8,
    city: 'Butwal',
    district: 'Rupandehi',
  },
  {
    id: 'fb-seller-2',
    displayName: 'Ram Gurung',
    verificationStatus: 'VERIFIED',
    sellerRatingAvg: 4.5,
    city: 'Bhairahawa',
    district: 'Rupandehi',
  },
  {
    id: 'fb-seller-3',
    displayName: 'Anisha KC',
    verificationStatus: 'VERIFIED',
    sellerRatingAvg: 4.9,
    city: 'Tilottama',
    district: 'Rupandehi',
  },
];

function product({
  id,
  title,
  description,
  categoryId,
  categoryName,
  condition,
  price,
  city,
  district,
  seller,
  brand = null,
  model = null,
  views = 40,
  seed,
}) {
  const now = new Date().toISOString();
  return {
    id,
    title,
    description,
    categoryId,
    subcategoryId: null,
    categoryName,
    condition,
    price,
    currency: 'NPR',
    isNegotiable: true,
    brand,
    model,
    purchaseYear: 2022,
    deliverySizeTier: 'MEDIUM',
    deliveryEligible: true,
    requiresTrolley: false,
    meetupAvailable: true,
    city,
    district,
    status: 'ACTIVE',
    viewCount: views,
    publishedAt: now,
    createdAt: now,
    seller: {
      id: seller.id,
      displayName: seller.displayName,
      verificationStatus: seller.verificationStatus,
      sellerRatingAvg: seller.sellerRatingAvg,
    },
    images: [
      { id: `${id}-img-1`, url: img(seed), isPrimary: true, sortOrder: 0 },
      { id: `${id}-img-2`, url: img(`${seed}-b`), isPrimary: false, sortOrder: 1 },
    ],
  };
}

const [s1, s2, s3] = FALLBACK_SELLERS;

export const FALLBACK_PRODUCTS = [
  product({
    id: 'fb-prod-01',
    title: 'iPhone 12 128GB — clean condition',
    description: 'Battery healthy, dual SIM, box included. Meetup in Butwal or delivery across Rupandehi.',
    categoryId: 2,
    categoryName: 'Mobile Phones',
    condition: 'GOOD',
    price: 45000,
    city: 'Butwal',
    district: 'Rupandehi',
    seller: s1,
    brand: 'Apple',
    model: 'iPhone 12',
    views: 210,
    seed: 'iphone12',
  }),
  product({
    id: 'fb-prod-02',
    title: 'Dell Inspiron 15 laptop',
    description: 'i5 / 8GB / 512GB SSD. Great for college and office work. Charger included.',
    categoryId: 3,
    categoryName: 'Laptops',
    condition: 'GOOD',
    price: 38000,
    city: 'Bhairahawa',
    district: 'Rupandehi',
    seller: s2,
    brand: 'Dell',
    model: 'Inspiron 15',
    views: 165,
    seed: 'dell-laptop',
  }),
  product({
    id: 'fb-prod-03',
    title: 'Wooden study table with drawer',
    description: 'Solid wood study desk, lightly used. Pickup preferred in Tilottama.',
    categoryId: 4,
    categoryName: 'Furniture',
    condition: 'FAIR',
    price: 6500,
    city: 'Tilottama',
    district: 'Rupandehi',
    seller: s3,
    views: 88,
    seed: 'study-table',
  }),
  product({
    id: 'fb-prod-04',
    title: 'Yamaha acoustic guitar F310',
    description: 'Well maintained beginner guitar with soft case. Ideal for students.',
    categoryId: 10,
    categoryName: 'Musical Instruments',
    condition: 'GOOD',
    price: 12000,
    city: 'Lumbini',
    district: 'Rupandehi',
    seller: s1,
    brand: 'Yamaha',
    model: 'F310',
    views: 120,
    seed: 'guitar-f310',
  }),
  product({
    id: 'fb-prod-05',
    title: 'Samsung 32" Smart TV',
    description: 'Full HD smart TV with remote and wall mount kit. Screen perfect.',
    categoryId: 1,
    categoryName: 'Electronics',
    condition: 'GOOD',
    price: 22000,
    city: 'Sainamaina',
    district: 'Rupandehi',
    seller: s2,
    brand: 'Samsung',
    views: 143,
    seed: 'samsung-tv',
  }),
  product({
    id: 'fb-prod-06',
    title: 'Hero Passion Pro 2019',
    description: 'Single owner, papers clear, recently serviced. Test ride in Taulihawa.',
    categoryId: 5,
    categoryName: 'Vehicles',
    condition: 'GOOD',
    price: 85000,
    city: 'Taulihawa',
    district: 'Kapilvastu',
    seller: s3,
    brand: 'Hero',
    model: 'Passion Pro',
    views: 260,
    seed: 'hero-bike',
  }),
  product({
    id: 'fb-prod-07',
    title: 'Engineering textbooks set (8 books)',
    description: 'Civil engineering semester books in good condition. Bundle price.',
    categoryId: 6,
    categoryName: 'Books',
    condition: 'FAIR',
    price: 2500,
    city: 'Devdaha',
    district: 'Rupandehi',
    seller: s1,
    views: 54,
    seed: 'eng-books',
  }),
  product({
    id: 'fb-prod-08',
    title: 'Winter jacket — Uniqlo medium',
    description: 'Warm winter jacket, barely used. Smoke-free home.',
    categoryId: 7,
    categoryName: 'Clothing',
    condition: 'NEW_LIKE',
    price: 3200,
    city: 'Manigram',
    district: 'Rupandehi',
    seller: s2,
    views: 67,
    seed: 'winter-jacket',
  }),
  product({
    id: 'fb-prod-09',
    title: 'LG semi-automatic washing machine',
    description: '6.5kg twin tub, works perfectly. Needs two people to move.',
    categoryId: 8,
    categoryName: 'Appliances',
    condition: 'GOOD',
    price: 9000,
    city: 'Butwal',
    district: 'Rupandehi',
    seller: s3,
    brand: 'LG',
    views: 99,
    seed: 'washing-machine',
  }),
  product({
    id: 'fb-prod-10',
    title: 'Football + pump set',
    description: 'Size 5 match ball with hand pump. Great for school practice.',
    categoryId: 9,
    categoryName: 'Sports',
    condition: 'GOOD',
    price: 1500,
    city: 'Krishnanagar',
    district: 'Kapilvastu',
    seller: s1,
    views: 41,
    seed: 'football',
  }),
  product({
    id: 'fb-prod-11',
    title: 'Indoor plants pair with pots',
    description: 'Two healthy money plants in ceramic pots. Pickup in Kapilvastu.',
    categoryId: 11,
    categoryName: 'Home & Garden',
    condition: 'GOOD',
    price: 800,
    city: 'Kapilvastu',
    district: 'Kapilvastu',
    seller: s2,
    views: 36,
    seed: 'plants',
  }),
  product({
    id: 'fb-prod-12',
    title: 'Kids bicycle 16 inch',
    description: 'Safe training bike with side wheels. Ideal for ages 4–7.',
    categoryId: 12,
    categoryName: 'Other',
    condition: 'FAIR',
    price: 4500,
    city: 'Bahadurganj',
    district: 'Kapilvastu',
    seller: s3,
    views: 78,
    seed: 'kids-bike',
  }),
];

export function getFallbackAreas() {
  const counts = new Map();
  for (const p of FALLBACK_PRODUCTS) {
    const key = `${p.city}|${p.district}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()].map(([key, listingCount]) => {
    const [city, district] = key.split('|');
    return { city, district, listingCount };
  });
}

export function filterFallbackProducts(params = {}) {
  let list = [...FALLBACK_PRODUCTS];
  const q = String(params.q || '').trim().toLowerCase();
  if (q) {
    list = list.filter(
      (p) =>
        p.title.toLowerCase().includes(q)
        || p.description.toLowerCase().includes(q)
        || (p.brand || '').toLowerCase().includes(q),
    );
  }
  if (params.categoryId) {
    const cid = Number(params.categoryId);
    list = list.filter((p) => p.categoryId === cid);
  }
  if (params.city) list = list.filter((p) => p.city.toLowerCase() === String(params.city).toLowerCase());
  if (params.district) {
    list = list.filter((p) => p.district.toLowerCase() === String(params.district).toLowerCase());
  }
  if (params.condition) list = list.filter((p) => p.condition === params.condition);
  if (params.minPrice !== undefined && params.minPrice !== '') {
    list = list.filter((p) => Number(p.price) >= Number(params.minPrice));
  }
  if (params.maxPrice !== undefined && params.maxPrice !== '') {
    list = list.filter((p) => Number(p.price) <= Number(params.maxPrice));
  }
  if (params.verifiedOnly === true || params.verifiedOnly === 'true') {
    list = list.filter((p) => p.seller?.verificationStatus === 'VERIFIED');
  }

  const sort = params.sort || 'newest';
  if (sort === 'price_asc') list.sort((a, b) => a.price - b.price);
  else if (sort === 'price_desc') list.sort((a, b) => b.price - a.price);
  else if (sort === 'popular') list.sort((a, b) => b.viewCount - a.viewCount);
  else list.sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)));

  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.max(1, Number(params.limit) || 24);
  const total = list.length;
  const start = (page - 1) * limit;
  const products = list.slice(start, start + limit);
  return {
    products,
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}

export function getFallbackProduct(id) {
  return FALLBACK_PRODUCTS.find((p) => p.id === id) || FALLBACK_PRODUCTS[0];
}

export const FALLBACK_FAVORITE_IDS = ['fb-prod-01', 'fb-prod-04', 'fb-prod-06'];

export function getFallbackFavorites() {
  return FALLBACK_PRODUCTS.filter((p) => FALLBACK_FAVORITE_IDS.includes(p.id));
}

export const FALLBACK_MY_LISTINGS = FALLBACK_PRODUCTS.slice(0, 4).map((p, i) => ({
  ...p,
  seller: {
    id: FALLBACK_DEMO_USER.id,
    displayName: FALLBACK_DEMO_USER.displayName,
    verificationStatus: 'VERIFIED',
    sellerRatingAvg: 4.7,
  },
  status: i === 3 ? 'DRAFT' : 'ACTIVE',
  title: i === 0 ? 'My listing: Bluetooth speaker' : p.title,
}));

export const FALLBACK_OFFERS_MINE = [
  {
    id: 'fb-offer-1',
    productId: 'fb-prod-01',
    productTitle: 'iPhone 12 128GB — clean condition',
    productPrice: 45000,
    buyerId: FALLBACK_DEMO_USER.id,
    sellerId: s1.id,
    buyerName: FALLBACK_DEMO_USER.displayName,
    sellerName: s1.displayName,
    amount: 42000,
    message: 'Can do meetup this weekend in Butwal.',
    status: 'PENDING',
    parentOfferId: null,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'fb-offer-2',
    productId: 'fb-prod-02',
    productTitle: 'Dell Inspiron 15 laptop',
    productPrice: 38000,
    buyerId: FALLBACK_DEMO_USER.id,
    sellerId: s2.id,
    buyerName: FALLBACK_DEMO_USER.displayName,
    sellerName: s2.displayName,
    amount: 35000,
    message: null,
    status: 'ACCEPTED',
    parentOfferId: null,
    createdAt: new Date(Date.now() - 172800000).toISOString(),
  },
];

export const FALLBACK_OFFERS_INCOMING = [
  {
    id: 'fb-offer-3',
    productId: 'fb-prod-03',
    productTitle: 'Wooden study table with drawer',
    productPrice: 6500,
    buyerId: 'fb-buyer-2',
    sellerId: FALLBACK_DEMO_USER.id,
    buyerName: 'Kiran Sharma',
    sellerName: FALLBACK_DEMO_USER.displayName,
    amount: 5500,
    message: 'Is delivery to Bhairahawa possible?',
    status: 'PENDING',
    parentOfferId: null,
    createdAt: new Date(Date.now() - 43200000).toISOString(),
  },
];

export const FALLBACK_CONVERSATIONS = [
  {
    id: 'fb-conv-1',
    productId: 'fb-prod-01',
    productTitle: 'iPhone 12 128GB — clean condition',
    otherUser: { id: s1.id, displayName: s1.displayName },
    unreadCount: 1,
    lastMessage: {
      id: 'fb-msg-2',
      body: 'Yes, Traffic Chowk works for me at 4pm.',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      senderId: s1.id,
    },
  },
  {
    id: 'fb-conv-2',
    productId: 'fb-prod-06',
    productTitle: 'Hero Passion Pro 2019',
    otherUser: { id: s3.id, displayName: s3.displayName },
    unreadCount: 0,
    lastMessage: {
      id: 'fb-msg-4',
      body: 'Papers are ready whenever you want to check.',
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      senderId: FALLBACK_DEMO_USER.id,
    },
  },
];

export function getFallbackConversation(id) {
  const conversation = FALLBACK_CONVERSATIONS.find((c) => c.id === id) || FALLBACK_CONVERSATIONS[0];
  const messages = [
    {
      id: `${conversation.id}-m1`,
      conversationId: conversation.id,
      senderId: FALLBACK_DEMO_USER.id,
      body: 'Hi, is this still available?',
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      isRead: true,
    },
    {
      id: `${conversation.id}-m2`,
      conversationId: conversation.id,
      senderId: conversation.otherUser.id,
      body: conversation.lastMessage?.body || 'Yes, it is available.',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      isRead: true,
    },
  ];
  return { conversation, messages };
}

export const FALLBACK_ORDERS_PURCHASES = [
  {
    id: 'fb-order-1',
    orderNumber: 'FR-1001',
    productId: 'fb-prod-02',
    productTitle: 'Dell Inspiron 15 laptop',
    buyerId: FALLBACK_DEMO_USER.id,
    sellerId: s2.id,
    buyerName: FALLBACK_DEMO_USER.displayName,
    sellerName: s2.displayName,
    productPrice: 35000,
    deliveryCharge: 0,
    trolleyCharge: 0,
    totalAmount: 35000,
    fulfillmentType: 'MEETUP',
    meetupLocationNote: 'Near Bus Park, Bhairahawa',
    deliveryAddress: null,
    status: 'CONFIRMED',
    createdAt: new Date(Date.now() - 259200000).toISOString(),
  },
  {
    id: 'fb-order-2',
    orderNumber: 'FR-1002',
    productId: 'fb-prod-05',
    productTitle: 'Samsung 32" Smart TV',
    buyerId: FALLBACK_DEMO_USER.id,
    sellerId: s2.id,
    buyerName: FALLBACK_DEMO_USER.displayName,
    sellerName: s2.displayName,
    productPrice: 22000,
    deliveryCharge: 500,
    trolleyCharge: 200,
    totalAmount: 22700,
    fulfillmentType: 'DELIVERY',
    meetupLocationNote: null,
    deliveryAddress: { street: 'Golpark', city: 'Butwal', district: 'Rupandehi', phone: '9800000001' },
    status: 'IN_TRANSIT',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

export const FALLBACK_ORDERS_SALES = [
  {
    id: 'fb-order-3',
    orderNumber: 'FR-1003',
    productId: 'fb-prod-03',
    productTitle: 'Wooden study table with drawer',
    buyerId: 'fb-buyer-2',
    sellerId: FALLBACK_DEMO_USER.id,
    buyerName: 'Kiran Sharma',
    sellerName: FALLBACK_DEMO_USER.displayName,
    productPrice: 6500,
    deliveryCharge: 0,
    trolleyCharge: 0,
    totalAmount: 6500,
    fulfillmentType: 'MEETUP',
    meetupLocationNote: 'Tilottama chowk',
    deliveryAddress: null,
    status: 'PENDING',
    createdAt: new Date(Date.now() - 43200000).toISOString(),
  },
];

export function getFallbackOrder(id) {
  const order = [...FALLBACK_ORDERS_PURCHASES, ...FALLBACK_ORDERS_SALES].find((o) => o.id === id)
    || FALLBACK_ORDERS_PURCHASES[0];
  return {
    order,
    history: [
      { status: 'PENDING', note: 'Order placed', createdAt: order.createdAt, actorName: order.buyerName },
      {
        status: order.status,
        note: 'Status updated',
        createdAt: new Date().toISOString(),
        actorName: 'System',
      },
    ],
  };
}

export function getFallbackOrderQuote() {
  return {
    distanceKm: 12,
    deliveryCharge: 500,
    trolleyCharge: 0,
    totalDelivery: 500,
  };
}

export const FALLBACK_NOTIFICATIONS = {
  unreadCount: 2,
  notifications: [
    {
      id: 'fb-notif-1',
      title: 'New offer received',
      body: 'Kiran offered Rs. 5,500 on your study table.',
      link: '/app/offers',
      isRead: false,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 'fb-notif-2',
      title: 'Order in transit',
      body: 'Your Samsung TV order FR-1002 is on the way.',
      link: '/app/orders/fb-order-2',
      isRead: false,
      createdAt: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: 'fb-notif-3',
      title: 'Offer accepted',
      body: 'Ram accepted your offer on the Dell laptop.',
      link: '/app/offers',
      isRead: true,
      createdAt: new Date(Date.now() - 172800000).toISOString(),
    },
  ],
};

export const FALLBACK_REPORTS = [
  {
    id: 'fb-report-1',
    targetType: 'PRODUCT',
    category: 'MISLEADING',
    description: 'Photos look stock / misleading for a local listing.',
    reason: 'Suspected fake photos',
    status: 'OPEN',
    adminNotes: null,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

export const FALLBACK_ADMIN_STATS = {
  users: { active: 120, verified: 95, suspended: 3 },
  products: { active: 212, removed: 5 },
  orders: { pending: 8, completed: 38 },
  reports: { open: 3 },
  verifications: { pending: 2 },
};

export const FALLBACK_ADMIN_USERS = [
  {
    ...FALLBACK_DEMO_USER,
    accountStatus: 'ACTIVE',
    totalSales: 2,
    totalPurchases: 5,
    createdAt: new Date().toISOString(),
  },
  {
    ...FALLBACK_ADMIN_USER,
    accountStatus: 'ACTIVE',
    totalSales: 0,
    totalPurchases: 0,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'fb-user-3',
    email: 'sita@ferilo.local',
    displayName: 'Sita Thapa',
    role: 'USER',
    verificationStatus: 'VERIFIED',
    accountStatus: 'ACTIVE',
    city: 'Butwal',
    district: 'Rupandehi',
    totalSales: 14,
    totalPurchases: 3,
    createdAt: new Date().toISOString(),
  },
];

export function getFallbackUserReviews(userId) {
  const seller = FALLBACK_SELLERS.find((s) => s.id === userId) || FALLBACK_SELLERS[0];
  return {
    user: {
      id: seller.id,
      displayName: seller.displayName,
      city: seller.city,
      district: seller.district,
      verificationStatus: seller.verificationStatus,
      bio: 'Trusted local seller on FERILO (offline preview profile).',
      memberSince: new Date(Date.now() - 1000 * 60 * 60 * 24 * 400).toISOString(),
      totalSales: 14,
      totalPurchases: 3,
    },
    summary: {
      asSeller: { average: seller.sellerRatingAvg || 4.7, count: 12 },
      asBuyer: { average: 4.8, count: 3 },
    },
    reviews: [
      {
        id: 'fb-rev-1',
        rating: 5,
        comment: 'Smooth meetup and item as described.',
        reviewerName: 'Demo Buyer',
        productTitle: 'iPhone 12 128GB — clean condition',
        productId: 'fb-prod-01',
        createdAt: new Date(Date.now() - 604800000).toISOString(),
      },
      {
        id: 'fb-rev-2',
        rating: 4,
        comment: 'Good seller, slightly delayed but helpful.',
        reviewerName: 'Kiran Sharma',
        productTitle: 'Dell Inspiron 15 laptop',
        productId: 'fb-prod-02',
        createdAt: new Date(Date.now() - 1209600000).toISOString(),
      },
    ],
  };
}

export const FALLBACK_VERIFICATION = {
  status: 'VERIFIED',
  documentType: 'CITIZENSHIP',
  submittedAt: new Date(Date.now() - 1209600000).toISOString(),
  reviewedAt: new Date(Date.now() - 604800000).toISOString(),
  rejectionReason: null,
};
