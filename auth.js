// =====================================================================
// BARE BEAUTY INVENTORY MANAGEMENT SYSTEM (IMS)
// Authentication & Session Management Module
// =====================================================================

window.BareBeauty = window.BareBeauty || {};
BareBeauty.modules = BareBeauty.modules || {};

function isSignedIn() {
  return session;
}

function showLogin() {
  BareBeauty.modals.closeModal();
  const app = $("#appView");
  const login = $("#loginView");
  if (app) app.classList.add("hidden");
  if (login) login.classList.remove("hidden");
}

function enterApp() {
  const login = $("#loginView");
  const app = $("#appView");
  if (login) login.classList.add("hidden");
  if (app) app.classList.remove("hidden");
  BareBeauty.navigation.setPage("dashboard", false);
}

async function handleSignIn(email, password) {
  // Validate inputs
  if (!email || !password) {
    showToast("Please enter your email and password.", true);
    return;
  }

  // Require Supabase for authentication
  if (!isSupabaseActive() || !BareBeauty.services.auth) {
    showToast("Unable to connect to the authentication server. Please try again later.", true);
    return;
  }

  try {
    const user = await BareBeauty.services.auth.signIn(email, password);
    session = true;
    showToast(`Welcome back, ${BareBeauty.config.ADMIN.name}!`);
    enterApp();
  } catch (err) {
    showToast(err.message, true);
  }
}

async function handleSignOut() {
  // Save any active inline debounced edits before logout
  await saveAllQuantities();

  if (isSupabaseActive() && BareBeauty.services.auth) {
    try {
      await BareBeauty.services.auth.signOut();
    } catch (e) {
      console.warn("Sign out remote notice:", e);
    }
  }

  session = false;
  try {
    localStorage.removeItem(BareBeauty.config.AUTH_KEY);
  } catch (e) {
    console.warn("Session clear notice:", e);
  }

  BareBeauty.state.products = [];
  BareBeauty.state.history = [];
  BareBeauty.state.lastReport = null;

  document.querySelectorAll(".page").forEach((page) => (page.innerHTML = ""));
  showLogin();
}

BareBeauty.modules.auth = {
  isSignedIn,
  showLogin,
  enterApp,
  handleSignIn,
  handleSignOut,
};
