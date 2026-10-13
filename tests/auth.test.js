
/**
 * @jest-environment jsdom
 */

// Provide browser cryptography APIs for Jest.
const { TextEncoder, TextDecoder } = require("node:util");
const { webcrypto } = require("node:crypto");

globalThis.TextEncoder = TextEncoder;
globalThis.TextDecoder = TextDecoder;

Object.defineProperty(globalThis, "crypto", {
  configurable: true,
  value: webcrypto
});

const {
  generateCodeVerifier,
  generateCodeChallenge,
  buildLoginUrl,
  validateOAuthState,
  buildTokenRequestBody,
  exchangeAuthorizationCode,
  handleOAuthCallback,
  getStoredSession,
  clearSession,
  buildLogoutUrl
} = require("../js/auth");

// ---------- COGNITO AUTHENTICATION ----------

describe("CloudLost Cognito Authentication", () => {
  test("generates a valid PKCE code verifier", () => {
    const verifier = generateCodeVerifier();

    expect(verifier).toMatch(/^[A-Za-z0-9_-]{43,128}$/);
  });

  test("generates a valid SHA-256 code challenge", async () => {
    const challenge = await generateCodeChallenge(
      "test-code-verifier"
    );

    expect(challenge).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  test("builds the correct Cognito login URL", () => {
    const url = new URL(
      buildLoginUrl("test-challenge", "test-state")
    );

    expect(url.pathname).toBe("/oauth2/authorize");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("client_id")).toBe(
      "5m37jenp75b4gqbourthjp3arh"
    );
    expect(url.searchParams.get("redirect_uri")).toBe(
      "http://localhost:8000/"
    );
    expect(url.searchParams.get("code_challenge_method")).toBe(
      "S256"
    );
    expect(url.searchParams.get("code_challenge")).toBe(
      "test-challenge"
    );
    expect(url.searchParams.get("state")).toBe(
      "test-state"
    );
  });
});

// ---------- OAUTH CALLBACK HELPERS ----------

describe("Cognito OAuth Callback", () => {
  test("accepts matching OAuth states", () => {
    expect(
      validateOAuthState("saved-state", "saved-state")
    ).toBe(true);
  });

  test("rejects mismatched OAuth states", () => {
    expect(
      validateOAuthState("wrong-state", "saved-state")
    ).toBe(false);
  });

  test("rejects missing OAuth states", () => {
    expect(
      validateOAuthState("", "saved-state")
    ).toBe(false);

    expect(
      validateOAuthState("returned-state", null)
    ).toBe(false);
  });

  test("builds the Cognito token exchange request", () => {
    const body = buildTokenRequestBody(
      "test-authorization-code",
      "test-pkce-verifier"
    );

    const params = new URLSearchParams(body);

    expect(params.get("grant_type")).toBe(
      "authorization_code"
    );
    expect(params.get("client_id")).toBe(
      "5m37jenp75b4gqbourthjp3arh"
    );
    expect(params.get("redirect_uri")).toBe(
      "http://localhost:8000/"
    );
    expect(params.get("code")).toBe(
      "test-authorization-code"
    );
    expect(params.get("code_verifier")).toBe(
      "test-pkce-verifier"
    );
  });
});

// ---------- COMPLETE AUTHENTICATION ----------

describe("CloudLost completed authentication", () => {
  beforeEach(() => {
    sessionStorage.clear();
    window.history.replaceState({}, "", "/");
    jest.restoreAllMocks();
  });

  test("exchanges the authorization code using PKCE", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: "test-access-token",
        id_token: "test-id-token",
        expires_in: 3600,
        token_type: "Bearer"
      })
    });

    const tokens = await exchangeAuthorizationCode(
      "test-code",
      "test-verifier",
      fetchMock
    );

    expect(tokens.access_token).toBe("test-access-token");

    const [url, options] = fetchMock.mock.calls[0];

    expect(url).toContain("/oauth2/token");
    expect(options.method).toBe("POST");
    expect(options.headers["Content-Type"]).toBe(
      "application/x-www-form-urlencoded"
    );

    const body = new URLSearchParams(options.body);

    expect(body.get("grant_type")).toBe(
      "authorization_code"
    );
    expect(body.get("code")).toBe("test-code");
    expect(body.get("code_verifier")).toBe(
      "test-verifier"
    );
  });

  test("rejects a failed token exchange", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 400
    });

    await expect(
      exchangeAuthorizationCode(
        "invalid-code",
        "test-verifier",
        fetchMock
      )
    ).rejects.toThrow("Cognito token exchange failed");
  });

  test("rejects a callback with an invalid state", async () => {
    sessionStorage.setItem(
      "cloudlost_oauth_state",
      "expected"
    );

    sessionStorage.setItem(
      "cloudlost_pkce_verifier",
      "verifier"
    );

    const fetchMock = jest.fn();

    await expect(
      handleOAuthCallback(
        "?code=test-code&state=wrong",
        fetchMock
      )
    ).rejects.toThrow("Invalid OAuth state");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(getStoredSession()).toBeNull();
  });

  test("processes a valid callback and creates a session", async () => {
    sessionStorage.setItem(
      "cloudlost_oauth_state",
      "expected"
    );

    sessionStorage.setItem(
      "cloudlost_pkce_verifier",
      "verifier"
    );

    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: "test-access-token",
        id_token: "test-id-token",
        expires_in: 3600,
        token_type: "Bearer"
      })
    });

    const result = await handleOAuthCallback(
      "?code=test-code&state=expected",
      fetchMock
    );

    expect(result).toBe(true);

    expect(getStoredSession().accessToken).toBe(
      "test-access-token"
    );

    expect(
      sessionStorage.getItem("cloudlost_pkce_verifier")
    ).toBeNull();

    expect(
      sessionStorage.getItem("cloudlost_oauth_state")
    ).toBeNull();
  });

  test("rejects an expired session", () => {
    sessionStorage.setItem(
      "cloudlost_session",
      JSON.stringify({
        accessToken: "expired-token",
        expiresAt: Date.now() - 1000
      })
    );

    expect(getStoredSession()).toBeNull();
  });

  test("clears the local session on logout", () => {
    sessionStorage.setItem(
      "cloudlost_session",
      "test"
    );

    clearSession();

    expect(
      sessionStorage.getItem("cloudlost_session")
    ).toBeNull();
  });

  test("builds the Cognito logout URL", () => {
    const url = new URL(buildLogoutUrl());

    expect(url.pathname).toBe("/logout");

    expect(url.searchParams.get("client_id")).toBe(
      "5m37jenp75b4gqbourthjp3arh"
    );

    expect(url.searchParams.get("logout_uri")).toBe(
      "http://localhost:8000/"
    );
  });
});
