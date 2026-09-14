// frontend/src/utils/foodIcons.js
export const CATEGORY_ICONS = {
  pizza: '🍕', burgers: '🍔', burger: '🍔',
  chicken: '🍗', pasta: '🍝', sushi: '🍣',
  sides: '🍟', fries: '🍟', salads: '🥗', salad: '🥗',
  soups: '🍲', soup: '🍲', desserts: '🍰', dessert: '🍰',
  beverages: '🥤', drinks: '🥤', wraps: '🌯', wrap: '🌯',
  sandwiches: '🥪', appetizers: '🥟', main: '🍽️'
};

export const getCategoryIcon = (category) => {
  if (!category) return '🍽️';
  const key = category.toLowerCase().trim();
  return CATEGORY_ICONS[key] || '🍽️';
};

export const DIET_TAGS = [
  { id: 'vegetarian', label: '🥗 Vegetarian', color: '#8FA68E' },
  { id: 'vegan', label: '🌱 Vegan', color: '#00B248' },
  { id: 'halal', label: '☪️ Halal', color: '#4CAF50' },
  { id: 'spicy', label: '🌶️ Spicy', color: '#E53935' },
  { id: 'gluten-free', label: '🌾 Gluten-free', color: '#FFB800' },
  { id: 'contains-nuts', label: '🥜 Nuts', color: '#8D6E63' },
  { id: 'contains-dairy', label: '🥛 Dairy', color: '#64B5F6' },
  { id: 'contains-eggs', label: '🥚 Eggs', color: '#FFD54F' },
  { id: 'contains-seafood', label: '🦐 Seafood', color: '#26A69A' },
  { id: 'new', label: '✨ New', color: '#9D4EDD' },
  { id: 'popular', label: '🔥 Popular', color: '#FF3D68' },
  { id: 'chef', label: "👨‍🍳 Chef's pick", color: '#C9A961' }
];