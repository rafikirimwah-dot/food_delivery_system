// frontend/src/i18n/translations.js
export const translations = {
  en: {
    home: 'Home', restaurants: 'Restaurants', cart: 'Cart', myOrders: 'My Orders',
    dashboard: 'Dashboard', login: 'Login', register: 'Register', logout: 'Logout',
    search: 'Search restaurants, dishes…', orderNow: 'Order Now', addToCart: 'Add',
    checkout: 'Checkout', total: 'Total', subtotal: 'Subtotal',
    delivery: 'Delivery', free: 'FREE', rateOrder: 'Rate Order',
    trackOrder: 'Track Order', confirmDelivery: 'Confirm Delivery', orderAgain: 'Order Again',
    pending: 'Pending', confirmed: 'Confirmed', preparing: 'Preparing', ready: 'Ready',
    delivered: 'On the way', completed: 'Delivered', cancelled: 'Cancelled',
    allPrices: 'All Prices', nearbyHotels: 'Restaurants Near You',
    howItWorks: 'How FoodExpress works'
  },
  sw: {
    home: 'Nyumbani', restaurants: 'Migahawa', cart: 'Kikapu', myOrders: 'Oda Zangu',
    dashboard: 'Dashibodi', login: 'Ingia', register: 'Jisajili', logout: 'Toka',
    search: 'Tafuta migahawa, vyakula…', orderNow: 'Agiza Sasa', addToCart: 'Ongeza',
    checkout: 'Lipa', total: 'Jumla', subtotal: 'Jumla ndogo',
    delivery: 'Usafirishaji', free: 'BURE', rateOrder: 'Kadiria Oda',
    trackOrder: 'Fuatilia Oda', confirmDelivery: 'Thibitisha Kupokea', orderAgain: 'Agiza Tena',
    pending: 'Inasubiri', confirmed: 'Imethibitishwa', preparing: 'Inaandaliwa', ready: 'Tayari',
    delivered: 'Njiani', completed: 'Imefikishwa', cancelled: 'Imefutwa',
    allPrices: 'Bei Zote', nearbyHotels: 'Migahawa Karibu Nawe',
    howItWorks: 'FoodExpress Inavyofanya Kazi'
  }
};

export const useTranslation = (lang) => {
  const t = (key) => translations[lang]?.[key] || translations.en[key] || key;
  return { t };
};