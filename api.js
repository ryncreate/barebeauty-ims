// =====================================================================
// BARE BEAUTY INVENTORY MANAGEMENT SYSTEM (IMS)
// Central Data Access Gateway (API Repository Layer)
// =====================================================================

window.BareBeauty = window.BareBeauty || {};

// Client-side product validation rule engine
function checkProduct(body, creating, currentId) {
  const text = (value) => String(value ?? "").trim();
  const price = Number(body.price);
  const reorderLevel = Number(body.reorderLevel);

  if (!text(body.productId) || !text(body.productType) || !text(body.name) || !text(body.shade)) {
    throw new Error("Please fill in all the product details.");
  }
  if (!BareBeauty.config.CATEGORIES.includes(body.category)) {
    throw new Error("Please choose a valid category.");
  }
  if (!Number.isFinite(price) || price < 0) {
    throw new Error("Price must be 0 or more.");
  }
  if (!Number.isInteger(reorderLevel) || reorderLevel < 0) {
    throw new Error("Reorder level must be a whole number, 0 or more.");
  }
  if (creating && (!Number.isInteger(Number(body.stock || 0)) || Number(body.stock || 0) < 0)) {
    throw new Error("Opening stock must be a whole number, 0 or more.");
  }

  // Duplicate SKU prevention in local mode
  if (!isSupabaseActive()) {
    const duplicate = db.products.find(
      (p) => p.productId.toLowerCase() === text(body.productId).toLowerCase() && p.id !== currentId
    );
    if (duplicate) throw new Error("That Product ID is already used by another product.");
  }
}

// Checks if Supabase connection is configured and active
function isSupabaseActive() {
  return Boolean(
    window.BareBeauty &&
    BareBeauty.supabase &&
    BareBeauty.supabase.isConfigured &&
    BareBeauty.supabase.isConfigured() &&
    BareBeauty.supabase.client
  );
}

// Central API Gateway function
async function api(path, options = {}) {
  if (!isSignedIn()) {
    showLogin();
    throw new Error("Your session has ended. Please sign in again.");
  }

  const method = options.method || "GET";
  const body = options.body ? JSON.parse(options.body) : null;
  const [route, queryString] = path.split("?");
  const params = new URLSearchParams(queryString || "");
  const productMatch = route.match(/^\/products\/(\d+)(\/stock)?$/);

  // -------------------------------------------------------------------
  // 1. SUPABASE SERVICE LAYER (Delegates when configured)
  // -------------------------------------------------------------------
  if (isSupabaseActive()) {
    const sb = BareBeauty.supabase;

    if (route === "/products" && method === "GET") {
      return await BareBeauty.services.product.getAll();
    }
    if (route === "/products" && method === "POST") {
      checkProduct(body, true, null);
      return await BareBeauty.services.product.create(body);
    }
    if (productMatch && !productMatch[2] && method === "PATCH") {
      const id = Number(productMatch[1]);
      checkProduct(body, false, id);
      return await BareBeauty.services.product.update(id, body);
    }
    if (productMatch && !productMatch[2] && method === "DELETE") {
      const id = Number(productMatch[1]);
      return await BareBeauty.services.product.remove(id);
    }
    if (productMatch && productMatch[2] && method === "POST") {
      const id = Number(productMatch[1]);
      return await BareBeauty.services.stock.adjust(id, body);
    }
    if (route === "/inventory-history" && method === "GET") {
      const limit = Number(params.get("limit") || 50);
      return await BareBeauty.services.stock.getHistory(limit);
    }
    if (route === "/dashboard" && method === "GET") {
      return await BareBeauty.services.report.getDashboardSummary();
    }
  }

  // -------------------------------------------------------------------
  // 2. LOCAL BROWSER STORAGE FALLBACK (Pre-Supabase Offline Mode)
  // -------------------------------------------------------------------
  await new Promise((resolve) => setTimeout(resolve, 60));

  if (route === "/products" && method === "GET") {
    return db.products.map(withStatus);
  }

  if (route === "/products" && method === "POST") {
    checkProduct(body, true, null);
    const product = {
      id: db.nextProductId++,
      productId: body.productId.trim(),
      productType: body.productType.trim(),
      name: body.name.trim(),
      shade: body.shade.trim(),
      category: body.category,
      price: Number(body.price),
      stock: Number(body.stock || 0),
      reorderLevel: Number(body.reorderLevel),
    };
    db.products.push(product);
    saveDb(db);
    return withStatus(product);
  }

  if (productMatch && !productMatch[2] && method === "PATCH") {
    const product = db.products.find((p) => p.id === Number(productMatch[1]));
    if (!product) throw new Error("Product not found.");
    checkProduct(body, false, product.id);
    Object.assign(product, {
      productId: body.productId.trim(),
      productType: body.productType.trim(),
      name: body.name.trim(),
      shade: body.shade.trim(),
      category: body.category,
      price: Number(body.price),
      reorderLevel: Number(body.reorderLevel),
    });
    saveDb(db);
    return withStatus(product);
  }

  if (productMatch && !productMatch[2] && method === "DELETE") {
    db.products = db.products.filter((p) => p.id !== Number(productMatch[1]));
    saveDb(db);
    return null;
  }

  if (productMatch && productMatch[2] && method === "POST") {
    const product = db.products.find((p) => p.id === Number(productMatch[1]));
    if (!product) throw new Error("Product not found.");
    const quantity = Number(body.quantity);
    if (body.type !== "in" && body.type !== "out") throw new Error("Invalid stock movement.");
    if (!Number.isInteger(quantity) || quantity < 1) throw new Error("Enter a whole number of 1 or more.");
    if (body.type === "out" && quantity > product.stock) throw new Error(`Only ${product.stock} units are in stock.`);

    const previousStock = product.stock;
    const stockAfter = body.type === "in" ? previousStock + quantity : previousStock - quantity;
    const entry = {
      id: db.nextHistoryId++,
      productId: product.productId,
      productName: `${product.name} · ${product.shade}`,
      type: body.type,
      quantity,
      note: body.note || null,
      previousStock,
      stockAfter,
      performedBy: ADMIN.name,
      createdAt: new Date().toISOString(),
    };
    product.stock = stockAfter;
    db.history.unshift(entry);
    saveDb(db);
    return withStatus(product);
  }

  if (route === "/inventory-history" && method === "GET") {
    const limit = Number(params.get("limit") || 50);
    return db.history.slice(0, limit);
  }

  if (route === "/dashboard" && method === "GET") {
    const products = db.products.map(withStatus);
    return {
      totalProducts: products.length,
      totalStock: products.reduce((sum, p) => sum + p.stock, 0),
      lowStock: products.filter((p) => p.status === "Low Stock").length,
      outOfStock: products.filter((p) => p.status === "Out of Stock").length,
      categories: BareBeauty.config.CATEGORIES.map((name) => ({
        name,
        stock: products.filter((p) => p.category === name).reduce((sum, p) => sum + p.stock, 0),
      })),
      recentActivity: db.history.slice(0, 4),
    };
  }

  throw new Error("Unknown request endpoint.");
}

BareBeauty.api = api;
