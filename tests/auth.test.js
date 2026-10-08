
const {
  generateCodeVerifier,
  generateCodeChallenge,
  buildLoginUrl
} = require("../js/auth");

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

    expect(url.searchParams.get("code_challenge_method")).toBe("S256");

    expect(url.searchParams.get("code_challenge")).toBe(
      "test-challenge"
    );

    expect(url.searchParams.get("state")).toBe("test-state");
  });
});
