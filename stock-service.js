// =====================================================================
// BARE BEAUTY INVENTORY MANAGEMENT SYSTEM (IMS)
// Supabase Stock Transactions Service
// =====================================================================

window.BareBeauty = window.BareBeauty || {};
BareBeauty.services = BareBeauty.services || {};

// Format database row to frontend movement format
function formatDbMovement(row) {
  return {
    id: row.id,
    productId: row.sku || row.product_id,
    productName: row.product_name,
    type: row.transaction_type || row.type,
    quantity: Number(row.quantity),
    note: row.notes || row.note,
    previousStock: Number(row.previous_stock),
    stockAfter: Number(row.stock_after),
    performedBy: row.performed_by || BareBeauty.config.ADMIN.name,
    createdAt: row.created_at,
  };
}

BareBeauty.services.stock = {
  async adjust(productId, body) {
    const sb = BareBeauty.supabase.client;
    if (!sb) throw new Error("Supabase is not connected.");

    const quantity = Number(body.quantity);
    if (body.type !== "in" && body.type !== "out") throw new Error("Invalid stock movement.");
    if (!Number.isInteger(quantity) || quantity < 1) throw new Error("Enter a whole number of 1 or more.");

    // Attempt secure atomic RPC function first
    try {
      const { data, error } = await sb.rpc("process_stock_transaction", {
        p_product_id: productId,
        p_type: body.type,
        p_quantity: quantity,
        p_notes: body.note || null,
        p_performed_by: BareBeauty.config.ADMIN.name,
      });

      if (!error && data) {
        return withStatus({
          id: data.id,
          productId: data.product_id,
          productType: data.product_type,
          name: data.name,
          shade: data.shade,
          category: data.category,
          price: Number(data.price),
          stock: Number(data.stock),
          reorderLevel: Number(data.reorder_level),
        });
      }
    } catch (e) {
      console.warn("RPC attempt notice:", e);
    }

    // Direct transaction fallback
    const { data: prod, error: fetchErr } = await sb.from("products").select("*").eq("id", productId).single();
    if (fetchErr || !prod) throw new Error("Product not found.");
    if (body.type === "out" && quantity > prod.stock) throw new Error(`Only ${prod.stock} units are in stock.`);

    const previousStock = prod.stock;
    const stockAfter = body.type === "in" ? previousStock + quantity : previousStock - quantity;

    const { data: updated, error: updateErr } = await sb.from("products")
      .update({ stock: stockAfter, updated_at: new Date().toISOString() })
      .eq("id", productId)
      .select()
      .single();
    if (updateErr) throw new Error(updateErr.message);

    await sb.from("stock_transactions").insert([{
      product_id: productId,
      sku: prod.product_id,
      product_name: `${prod.name} · ${prod.shade}`,
      transaction_type: body.type,
      quantity,
      previous_stock: previousStock,
      stock_after: stockAfter,
      notes: body.note || null,
      performed_by: BareBeauty.config.ADMIN.name,
    }]);

    return withStatus({
      id: updated.id,
      productId: updated.product_id,
      productType: updated.product_type,
      name: updated.name,
      shade: updated.shade,
      category: updated.category,
      price: Number(updated.price),
      stock: Number(updated.stock),
      reorderLevel: Number(updated.reorder_level),
    });
  },

  async getHistory(limit = 50) {
    const sb = BareBeauty.supabase.client;
    if (!sb) throw new Error("Supabase is not connected.");

    const { data, error } = await sb.from("stock_transactions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    return data.map(formatDbMovement);
  },
};
