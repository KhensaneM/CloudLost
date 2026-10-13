
const COGNITO_CONFIG = {
  domain: "https://eu-north-1a3ipphyst.auth.eu-north-1.amazoncognito.com",
  clientId: "5m37jenp75b4gqbourthjp3arh",
  redirectUri: "http://localhost:8000/"
};

const STORAGE_KEYS = {
  verifier: "cloudlost_pkce_verifier",
  state: "cloudlost_oauth_state",
  session: "cloudlost_session"
};

// ---------- PKCE ----------

function generateCodeVerifier() {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);

  return Array.from(bytes, byte =>
    byte.toString(16).padStart(2, "0")
  ).join("") + "A";
}

async function generateCodeChallenge(verifier) {
  const data = new TextEncoder().encode(verifier);

  const hash = await globalThis.crypto.subtle.digest(
    "SHA-256",
    data
  );

  const binary = Array.from(
    new Uint8Array(hash),
    byte => String.fromCharCode(byte)
  ).join("");

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// ---------- LOGIN URL ----------

function buildLoginUrl(challenge, state) {
  const url = new URL(
    `${COGNITO_CONFIG.domain}/oauth2/authorize`
  );

  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", COGNITO_CONFIG.clientId);
  url.searchParams.set(
    "redirect_uri",
    COGNITO_CONFIG.redirectUri
  );
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("state", state);

  return url.toString();
}

function validateOAuthState(returnedState, savedState) {
  return Boolean(
    returnedState &&
    savedState &&
    returnedState === savedState
  );
}

async function login() {
  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);

  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);

  const state = Array.from(bytes, byte =>
    byte.toString(16).padStart(2, "0")
  ).join("");

  sessionStorage.setItem(STORAGE_KEYS.verifier, verifier);
  sessionStorage.setItem(STORAGE_KEYS.state, state);

  window.location.assign(buildLoginUrl(challenge, state));
}

// ---------- TOKEN EXCHANGE ----------

function buildTokenRequestBody(code, verifier) {
  const params = new URLSearchParams();

  params.set("grant_type", "authorization_code");
  params.set("client_id", COGNITO_CONFIG.clientId);
  params.set("redirect_uri", COGNITO_CONFIG.redirectUri);
  params.set("code", code);
  params.set("code_verifier", verifier);

  return params.toString();
}

async function exchangeAuthorizationCode(
  code,
  verifier,
  fetchFunction = globalThis.fetch
) {
  if (!code || !verifier) {
    throw new Error("Missing authorization code or PKCE verifier");
  }

  const response = await fetchFunction(
    `${COGNITO_CONFIG.domain}/oauth2/token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: buildTokenRequestBody(code, verifier)
    }
  );

  if (!response.ok) {
    throw new Error(
      `Cognito token exchange failed (${response.status})`
    );
  }

  const tokens = await response.json();

  if (
    typeof tokens.access_token !== "string" ||
    !tokens.access_token ||
    tokens.token_type !== "Bearer" ||
    !Number.isFinite(Number(tokens.expires_in)) ||
    Number(tokens.expires_in) <= 0
  ) {
    throw new Error("Invalid token response from Cognito");
  }

  return tokens;
}

// ---------- SESSION MANAGEMENT ----------

function saveSession(tokens) {
  const session = {
    accessToken: tokens.access_token,
    idToken: tokens.id_token || null,
    expiresAt: Date.now() + Number(tokens.expires_in) * 1000
  };

  sessionStorage.setItem(
    STORAGE_KEYS.session,
    JSON.stringify(session)
  );

  return session;
}

function clearSession() {
  sessionStorage.removeItem(STORAGE_KEYS.session);
  sessionStorage.removeItem(STORAGE_KEYS.verifier);
  sessionStorage.removeItem(STORAGE_KEYS.state);
}

function getStoredSession() {
  const stored = sessionStorage.getItem(STORAGE_KEYS.session);

  if (!stored) {
    return null;
  }

  try {
    const session = JSON.parse(stored);

    if (
      !session ||
      typeof session.accessToken !== "string" ||
      !session.accessToken ||
      typeof session.expiresAt !== "number" ||
      !Number.isFinite(session.expiresAt) ||
      session.expiresAt <= Date.now() + 60000
    ) {
      clearSession();
      return null;
    }

    return session;
  } catch {
    clearSession();
    return null;
  }
}

function getAccessToken() {
  const session = getStoredSession();
  return session ? session.accessToken : null;
}

// ---------- OAUTH CALLBACK ----------

async function handleOAuthCallback(
  search = window.location.search,
  fetchFunction = globalThis.fetch
) {
  const params = new URLSearchParams(search);

  const code = params.get("code");
  const returnedState = params.get("state");
  const oauthError = params.get("error");

  if (!code && !oauthError) {
    return false;
  }

  const savedState = sessionStorage.getItem(STORAGE_KEYS.state);
  const verifier = sessionStorage.getItem(STORAGE_KEYS.verifier);

  if (!validateOAuthState(returnedState, savedState)) {
    clearSession();
    throw new Error("Invalid OAuth state");
  }

  if (oauthError) {
    clearSession();
    throw new Error("Cognito authentication was unsuccessful");
  }

  if (!verifier) {
    clearSession();
    throw new Error("Missing PKCE verifier");
  }

  // OAuth state and verifier are single-use values.
  sessionStorage.removeItem(STORAGE_KEYS.state);
  sessionStorage.removeItem(STORAGE_KEYS.verifier);

  try {
    const tokens = await exchangeAuthorizationCode(
      code,
      verifier,
      fetchFunction
    );

    saveSession(tokens);
    return true;
  } catch (error) {
    clearSession();
    throw error;
  }
}

// ---------- LOGOUT ----------

function buildLogoutUrl() {
  const url = new URL(`${COGNITO_CONFIG.domain}/logout`);

  url.searchParams.set("client_id", COGNITO_CONFIG.clientId);
  url.searchParams.set("logout_uri", COGNITO_CONFIG.redirectUri);

  return url.toString();
}

function logout() {
  clearSession();
  window.location.assign(buildLogoutUrl());
}

// ---------- NAVIGATION ----------

function updateAuthNavigation() {
  if (typeof document === "undefined") {
    return;
  }

  const loginButton = document.getElementById("loginBtn");
  const logoutButton = document.getElementById("logoutBtn");

  const authenticated = Boolean(getStoredSession());

  if (loginButton) {
    loginButton.hidden = authenticated;
  }

  if (logoutButton) {
    logoutButton.hidden = !authenticated;
  }
}

// ---------- BROWSER INITIALIZATION ----------

async function initializeAuth() {
  const loginButton = document.getElementById("loginBtn");
  const logoutButton = document.getElementById("logoutBtn");

  if (loginButton) {
    loginButton.addEventListener("click", async () => {
      try {
        await login();
      } catch (error) {
        console.error("Unable to start Cognito login:", error);
        alert("Unable to start login. Please try again.");
      }
    });
  }

  if (logoutButton) {
    logoutButton.addEventListener("click", logout);
  }

  const params = new URLSearchParams(window.location.search);

  if (params.has("code") || params.has("error")) {
    try {
      await handleOAuthCallback(window.location.search);
    } catch (error) {
      console.error("Cognito callback failed:", error);
      alert("Login could not be completed. Please try again.");
    } finally {
      // Remove sensitive OAuth callback parameters from the URL.
      window.history.replaceState(
        {},
        "",
        window.location.pathname + window.location.hash
      );
    }
  }

  updateAuthNavigation();
}

// ---------- JEST EXPORTS ----------

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    generateCodeVerifier,
    generateCodeChallenge,
    buildLoginUrl,
    validateOAuthState,
    buildTokenRequestBody,
    exchangeAuthorizationCode,
    handleOAuthCallback,
    saveSession,
    getStoredSession,
    getAccessToken,
    clearSession,
    buildLogoutUrl,
    updateAuthNavigation
  };
}

// ---------- START IN BROWSER ----------

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initializeAuth,
      { once: true }
    );
  } else {
    initializeAuth();
  }
}
