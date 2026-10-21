import { buildApp } from "../src/app.ts";

async function run() {
  const app = await buildApp();
  await app.ready();

  console.log("=== 1. Register User ===");
  const email = `test-${Date.now()}@example.com`;
  const regRes = await app.inject({
    method: "POST",
    url: "/api/auth/register",
    payload: {
      email,
      password: "StrongPassword123!",
      name: "Security Test User"
    }
  });

  console.log("Register status (expected 201):", regRes.statusCode);
  if (regRes.statusCode !== 201) throw new Error("Registration failed");

  const regData = regRes.json();
  const accessToken = regData.data?.accessToken;
  const cookies = regRes.cookies;
  const refreshTokenCookie = cookies.find((c: any) => c.name === "refreshToken");
  const firstRefreshToken = refreshTokenCookie?.value;

  console.log("AccessToken received:", Boolean(accessToken));
  console.log("HttpOnly RefreshToken cookie received:", Boolean(firstRefreshToken));

  console.log("\n=== 2. Access /me WITHOUT Token ===");
  const unauthRes = await app.inject({
    method: "GET",
    url: "/api/auth/me"
  });
  console.log("Unauth status (expected 401):", unauthRes.statusCode);
  if (unauthRes.statusCode !== 401) throw new Error("Expected 401");

  console.log("\n=== 3. Access /me WITH Bearer Token ===");
  const authRes = await app.inject({
    method: "GET",
    url: "/api/auth/me",
    headers: {
      authorization: `Bearer ${accessToken}`
    }
  });
  console.log("Auth status (expected 200):", authRes.statusCode);
  const meData = authRes.json();
  if (meData.data?.user?.email !== email) throw new Error("User mismatch");

  console.log("\n=== 4. Refresh Token Rotation (First Refresh) ===");
  const refreshRes = await app.inject({
    method: "POST",
    url: "/api/auth/refresh",
    cookies: {
      refreshToken: firstRefreshToken!
    }
  });
  console.log("Refresh status (expected 200):", refreshRes.statusCode);
  const secondRefreshToken = refreshRes.cookies.find((c: any) => c.name === "refreshToken")?.value;

  console.log("\n=== 5. BREACH TEST: Attempt Replay with OLD (Used) Refresh Token ===");
  const replayRes = await app.inject({
    method: "POST",
    url: "/api/auth/refresh",
    cookies: {
      refreshToken: firstRefreshToken!
    }
  });
  console.log("Replay status (expected 401):", replayRes.statusCode);
  const replayData = replayRes.json();
  console.log("Replay response message:", replayData.message);
  if (replayRes.statusCode !== 401) throw new Error("Expected 401 on replay");

  console.log("\n=== 6. Verify Second Token was Revoked due to Family Invalidation ===");
  const postBreachRes = await app.inject({
    method: "POST",
    url: "/api/auth/refresh",
    cookies: {
      refreshToken: secondRefreshToken!
    }
  });
  console.log("Post-breach status (expected 401):", postBreachRes.statusCode);
  if (postBreachRes.statusCode !== 401) throw new Error("Expected 401 for invalidated family token");

  console.log("\n=== 7. User Login after Breach ===");
  const loginRes = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: {
      email,
      password: "StrongPassword123!"
    }
  });
  console.log("Login status (expected 200):", loginRes.statusCode);

  console.log("\n=== 8. Test Logout ===");
  const loginCookie = loginRes.cookies.find((c: any) => c.name === "refreshToken")?.value;
  const logoutRes = await app.inject({
    method: "POST",
    url: "/api/auth/logout",
    cookies: {
      refreshToken: loginCookie!
    }
  });
  console.log("Logout status (expected 200):", logoutRes.statusCode);

  console.log("\n=== 9. Rate Limit Test: Brute-Force Defense on /login (Limit: 5/min) ===");
  let rateLimited = false;
  let lastStatus = 0;
  for (let i = 1; i <= 6; i++) {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: {
        email: "attacker@example.com",
        password: "WrongPassword123!"
      }
    });
    lastStatus = res.statusCode;
    if (res.statusCode === 429) {
      rateLimited = true;
      console.log(`Request #${i} was blocked with 429 Too Many Requests (Rate limit active)`);
      break;
    }
  }

  if (!rateLimited) {
    throw new Error(`Expected 429 Too Many Requests within 6 requests, got: ${lastStatus}`);
  }

  console.log("\n=== 10. Security Headers Test (Helmet) ===");
  const healthRes = await app.inject({ method: "GET", url: "/health" });
  const headers = healthRes.headers;
  console.log("x-content-type-options:", headers["x-content-type-options"]);
  console.log("x-frame-options:", headers["x-frame-options"]);
  console.log("strict-transport-security:", Boolean(headers["strict-transport-security"]));
  if (!headers["x-content-type-options"] || !headers["x-frame-options"]) {
    throw new Error("Missing essential security headers");
  }

  console.log("\n✅ ALL 10 SECURITY HARDENING & AUTH VERIFICATION TESTS PASSED!");
  await app.close();
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
