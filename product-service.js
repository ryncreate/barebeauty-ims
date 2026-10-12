// =====================================================================
// BARE BEAUTY INVENTORY MANAGEMENT SYSTEM (IMS)
// Supabase Product Database Service
// =====================================================================

window.BareBeauty = window.BareBeauty || {};
BareBeauty.services = BareBeauty.services || {};

// Format database row to frontend product format
function formatDbProduct(row) {
  return withStatus({
    id: row.id,
    productId: row.product_id,
    productType: row.product_type,
    name: row.name,
    shade: row.shade,
    category: row.category,
    price: Number(row.price),
    stock: Number(row.stock),
    reorderLevel: Number(row.reorder_level),
  });
}

BareBeauty.services.product = {
  async getAll() {
    const sb = BareBeauty.supabase.client;
    if (!sb) throw new Error("Supabase is not connected.");

    const { data, error } = await sb.from("products").select("*").order("id", { ascending: true });
    if (error) throw new Error(error.message);
    return data.map(formatDbProduct);
  },

  async create(body) {
    const sb = BareBeauty.supabase.client;
    if (!sb) throw new Error("Supabase is not connected.");

    const { data, error } = await sb.from("products").insert([{
      product_id: body.productId.trim(),
      product_type: body.productType.trim(),
      name: body.name.trim(),
      shade: body.shade.trim(),
      category: body.category,
      price: Number(body.price),
      stock: Number(body.stock || 0),
      reorder_level: Number(body.reorderLevel),
    }]).select().single();

    if (error) {
      if (error.code === "23505") throw new Error("That Product ID is already used by another product.");
      throw new Error(error.message);
    }

    // If opening stock > 0, log opening stock movement
    if (Number(body.stock || 0) > 0) {
      await sb.from("stock_transactions").insert([{
        product_id: data.id,
        sku: data.product_id,
        product_name: `${data.name} · ${data.shade}`,
        transaction_type: "in",
        quantity: Number(body.stock),
        previous_stock: 0,
        stock_after: Number(body.stock),
        notes: "Opening stock",
        performed_by: BareBeauty.config.ADMIN.name,
      }]);
    }

    return formatDbProduct(data);
  },

  async update(id, body) {
    const sb = BareBeauty.supabase.client;
    if (!sb) throw new Error("Supabase is not connected.");

    const { data, error } = await sb.from("products").update({
      product_id: body.productId.trim(),
      product_type: body.productType.trim(),
      name: body.name.trim(),
      shade: body.shade.trim(),
      category: body.category,
      price: Number(body.price),
      reorder_level: Number(body.reorderLevel),
      updated_at: new Date().toISOString(),
    }).eq("id", id).select().single();

    if (error) {
      if (error.code === "23505") throw new Error("That Product ID is already used by another product.");
      throw new Error(error.message);
    }
    return formatDbProduct(data);
  },

  async remove(id) {
    const sb = BareBeauty.supabase.client;
    if (!sb) throw new Error("Supabase is not connected.");

    const { error } = await sb.from("products").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return null;
  },
};
