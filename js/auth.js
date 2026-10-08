
const COGNITO_CONFIG = {
  domain: "https://eu-north-1a3ipphyst.auth.eu-north-1.amazoncognito.com",
  clientId: "5m37jenp75b4gqbourthjp3arh",
  redirectUri: "http://localhost:8000/"
};

function generateCodeVerifier() {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);

  return Array.from(bytes, byte =>
    byte.toString(16).padStart(2, "0")
  ).join("") + "A";
}

async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);

  const hash = await globalThis.crypto.subtle.digest(
    "SHA-256",
    data
  );

  const bytes = new Uint8Array(hash);

  const binary = Array.from(bytes, byte =>
    String.fromCharCode(byte)
  ).join("");

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function buildLoginUrl(challenge, state) {
  const url = new URL(
    `${COGNITO_CONFIG.domain}/oauth2/authorize`
  );

  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", COGNITO_CONFIG.clientId);
  url.searchParams.set("redirect_uri", COGNITO_CONFIG.redirectUri);
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("state", state);

  return url.toString();
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    generateCodeVerifier,
    generateCodeChallenge,
    buildLoginUrl
  };
}
