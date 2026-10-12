// =====================================================================
// BARE BEAUTY INVENTORY MANAGEMENT SYSTEM (IMS)
// Mock Seed Data (Initial Makeup Catalogue & Historical Movements)
// =====================================================================

window.BareBeauty = window.BareBeauty || {};

BareBeauty.mockData = {
  seedDb() {
    const products = [
      { id: 1, productId: "EYE-EL-001", productType: "Eyeliner", name: "Liner", shade: "Black", category: "Eyes", price: 199, stock: 24, reorderLevel: 10 },
      { id: 2, productId: "EYE-MS-001", productType: "Mascara", name: "Lash Up", shade: "Jet Black", category: "Eyes", price: 249, stock: 18, reorderLevel: 10 },
      { id: 3, productId: "EYE-ES-001", productType: "Eyeshadow", name: "Eye Edit", shade: "Bingsu", category: "Eyes", price: 399, stock: 9, reorderLevel: 10 },
      { id: 4, productId: "EYE-ES-002", productType: "Eyeshadow", name: "Eye Edit", shade: "Macaron", category: "Eyes", price: 399, stock: 15, reorderLevel: 10 },
      { id: 5, productId: "LIP-LG-001", productType: "Lip Gloss", name: "Glass", shade: "Lychee", category: "Lips", price: 150, stock: 32, reorderLevel: 10 },
      { id: 6, productId: "LIP-LG-002", productType: "Lip Gloss", name: "Glass", shade: "Coconut", category: "Lips", price: 150, stock: 0, reorderLevel: 10 },
      { id: 7, productId: "LIP-ML-001", productType: "Matte Lipstick", name: "Plush", shade: "Brick", category: "Lips", price: 199, stock: 26, reorderLevel: 10 },
      { id: 8, productId: "LIP-ML-002", productType: "Matte Lipstick", name: "Plush", shade: "Terracotta", category: "Lips", price: 199, stock: 7, reorderLevel: 10 },
      { id: 9, productId: "LIP-SL-001", productType: "Satin Lipstick", name: "Satin", shade: "Mauve", category: "Lips", price: 159, stock: 20, reorderLevel: 10 },
      { id: 10, productId: "LIP-SL-002", productType: "Satin Lipstick", name: "Satin", shade: "Berry", category: "Lips", price: 159, stock: 14, reorderLevel: 10 },
      { id: 11, productId: "FAC-ST-001", productType: "Skin Tint", name: "Daily Tint", shade: "Pebble", category: "Face", price: 399, stock: 12, reorderLevel: 10 },
      { id: 12, productId: "FAC-ST-002", productType: "Skin Tint", name: "Daily Tint", shade: "Sand", category: "Face", price: 399, stock: 16, reorderLevel: 10 },
      { id: 13, productId: "FAC-CN-001", productType: "Concealer", name: "Base Cover", shade: "Beige", category: "Face", price: 255, stock: 22, reorderLevel: 10 },
      { id: 14, productId: "FAC-CN-002", productType: "Concealer", name: "Base Cover", shade: "Almond", category: "Face", price: 255, stock: 5, reorderLevel: 10 },
      { id: 15, productId: "FAC-CT-001", productType: "Contour", name: "Sculpt", shade: "Chestnut", category: "Face", price: 299, stock: 11, reorderLevel: 10 },
      { id: 16, productId: "FAC-CT-002", productType: "Contour", name: "Sculpt", shade: "Cocoa", category: "Face", price: 299, stock: 19, reorderLevel: 10 },
      { id: 17, productId: "FAC-FP-001", productType: "Face Powder", name: "Powder Rush", shade: "Translucent", category: "Face", price: 275, stock: 28, reorderLevel: 10 },
      { id: 18, productId: "FAC-FP-002", productType: "Face Powder", name: "Powder Rush", shade: "Honey", category: "Face", price: 275, stock: 0, reorderLevel: 10 },
      { id: 19, productId: "CHK-BL-001", productType: "Blush", name: "Milk Tint", shade: "Guava", category: "Cheeks", price: 299, stock: 30, reorderLevel: 10 },
      { id: 20, productId: "CHK-BL-002", productType: "Blush", name: "Milk Tint", shade: "Strawberry", category: "Cheeks", price: 299, stock: 17, reorderLevel: 10 },
      { id: 21, productId: "CHK-PB-001", productType: "Powder Blush", name: "Cheek Rush", shade: "Peach", category: "Cheeks", price: 299, stock: 8, reorderLevel: 10 },
      { id: 22, productId: "CHK-PB-002", productType: "Powder Blush", name: "Cheek Rush", shade: "Apricot", category: "Cheeks", price: 299, stock: 21, reorderLevel: 10 },
      { id: 23, productId: "CHK-HL-001", productType: "Highlighter", name: "Glow Rush", shade: "Champagne", category: "Cheeks", price: 250, stock: 13, reorderLevel: 10 },
      { id: 24, productId: "CHK-HL-002", productType: "Highlighter", name: "Glow Rush", shade: "Opal", category: "Cheeks", price: 250, stock: 25, reorderLevel: 10 },
      { id: 25, productId: "BRW-EP-001", productType: "Eyebrow Pencil", name: "Brow Pen", shade: "Espresso", category: "Brows", price: 150, stock: 34, reorderLevel: 10 },
      { id: 26, productId: "BRW-EP-002", productType: "Eyebrow Pencil", name: "Brow Pen", shade: "Dark Brown", category: "Brows", price: 150, stock: 10, reorderLevel: 10 },
      { id: 27, productId: "BRW-BT-001", productType: "Brow Tint", name: "Brow Tint", shade: "Taupe", category: "Brows", price: 245, stock: 15, reorderLevel: 10 },
      { id: 28, productId: "BRW-BL-001", productType: "Brow Laminator", name: "Brow Set", shade: "Clear", category: "Brows", price: 299, stock: 6, reorderLevel: 10 },
    ];

    const history = [
      { id: 12, productId: "EYE-ES-001", productName: "Eye Edit · Bingsu", type: "out", quantity: 6, note: null, stockAfter: 9, createdAt: daysAgo(0) },
      { id: 11, productId: "LIP-LG-002", productName: "Glass · Coconut", type: "out", quantity: 12, note: "Sold out at pop-up", stockAfter: 0, createdAt: daysAgo(1) },
      { id: 10, productId: "FAC-FP-002", productName: "Powder Rush · Honey", type: "out", quantity: 9, note: null, stockAfter: 0, createdAt: daysAgo(2) },
      { id: 9, productId: "FAC-CN-002", productName: "Base Cover · Almond", type: "out", quantity: 8, note: null, stockAfter: 5, createdAt: daysAgo(3) },
      { id: 8, productId: "BRW-EP-001", productName: "Brow Pen · Espresso", type: "in", quantity: 14, note: "New shipment", stockAfter: 34, createdAt: daysAgo(4) },
      { id: 7, productId: "CHK-PB-001", productName: "Cheek Rush · Peach", type: "out", quantity: 7, note: null, stockAfter: 8, createdAt: daysAgo(5) },
      { id: 6, productId: "FAC-CN-002", productName: "Base Cover · Almond", type: "in", quantity: 13, note: "Initial stock", stockAfter: 13, createdAt: daysAgo(7) },
      { id: 5, productId: "EYE-ES-001", productName: "Eye Edit · Bingsu", type: "in", quantity: 15, note: "Initial stock", stockAfter: 15, createdAt: daysAgo(7) },
      { id: 4, productId: "LIP-LG-002", productName: "Glass · Coconut", type: "in", quantity: 12, note: "Initial stock", stockAfter: 12, createdAt: daysAgo(8) },
      { id: 3, productId: "FAC-FP-002", productName: "Powder Rush · Honey", type: "in", quantity: 9, note: "Initial stock", stockAfter: 9, createdAt: daysAgo(9) },
      { id: 2, productId: "CHK-PB-001", productName: "Cheek Rush · Peach", type: "in", quantity: 15, note: "Initial stock", stockAfter: 15, createdAt: daysAgo(10) },
      { id: 1, productId: "BRW-EP-001", productName: "Brow Pen · Espresso", type: "in", quantity: 20, note: "Initial stock", stockAfter: 20, createdAt: daysAgo(10) },
    ];

    return { products, history, nextProductId: 29, nextHistoryId: 13 };
  },
};

// Global shorthand reference
function seedDb() {
  return BareBeauty.mockData.seedDb();
}
