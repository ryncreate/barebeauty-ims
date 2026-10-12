// =====================================================================
// BARE BEAUTY INVENTORY MANAGEMENT SYSTEM (IMS)
// Supabase Authentication Service
// =====================================================================

window.BareBeauty = window.BareBeauty || {};
BareBeauty.services = BareBeauty.services || {};

BareBeauty.services.auth = {
  async signIn(email, password) {
    const sb = BareBeauty.supabase.client;
    if (!sb) throw new Error("Supabase is not connected.");

    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);

    // Fetch administrative profile from 'profiles' table if available
    if (data?.user) {
      const { data: profile } = await sb.from("profiles").select("*").eq("id", data.user.id).maybeSingle();
      if (profile) {
        BareBeauty.config.ADMIN.name = profile.full_name || BareBeauty.config.ADMIN.name;
        BareBeauty.config.ADMIN.role = profile.role || BareBeauty.config.ADMIN.role;
        const nameEl = $("#userDisplayName");
        const roleEl = $("#userRoleName");
        if (nameEl) nameEl.textContent = BareBeauty.config.ADMIN.name;
        if (roleEl) roleEl.textContent = BareBeauty.config.ADMIN.role;
      }
    }

    return data.user;
  },

  async signOut() {
    const sb = BareBeauty.supabase.client;
    if (!sb) return;
    await sb.auth.signOut();
  },

  async getSession() {
    const sb = BareBeauty.supabase.client;
    if (!sb) return null;
    const { data: { session: currentSession } } = await sb.auth.getSession();
    return currentSession;
  },
};
