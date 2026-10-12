// =====================================================================
// BARE BEAUTY INVENTORY MANAGEMENT SYSTEM (IMS)
// Supabase Report & Dashboard Aggregation Service
// =====================================================================

window.BareBeauty = window.BareBeauty || {};
BareBeauty.services = BareBeauty.services || {};

BareBeauty.services.report = {
  async getDashboardSummary() {
    const [products, recentActivity] = await Promise.all([
      BareBeauty.services.product.getAll(),
      BareBeauty.services.stock.getHistory(4),
    ]);

    return {
      totalProducts: products.length,
      totalStock: products.reduce((sum, p) => sum + p.stock, 0),
      lowStock: products.filter((p) => p.status === "Low Stock").length,
      outOfStock: products.filter((p) => p.status === "Out of Stock").length,
      categories: BareBeauty.config.CATEGORIES.map((name) => ({
        name,
        stock: products.filter((p) => p.category === name).reduce((sum, p) => sum + p.stock, 0),
      })),
      recentActivity,
    };
  },
};
