import { hash, verify, Algorithm } from "@node-rs/argon2";

// Argon2id options according to OWASP guidelines:
// Memory: ~19MB (19456 KB) to 64MB, Iterations/Time: 2 to 3, Parallelism: 1
const ARGON2_OPTIONS = {
  algorithm: Algorithm.Argon2id,
  memoryCost: 19456, // 19 MB
  timeCost: 2,
  parallelism: 1
};

// Pre-computed dummy hash to prevent timing attacks when an email does not exist
const DUMMY_HASH = "$argon2id$v=19$m=19456,t=2,p=1$pnuZziqtyufO8se5hdTumw$isWkb5wfoV4yeSovmYcYpEXnRdtt3e9gI85ZMewstN4";

/**
 * Hash a plain text password using memory-hard Argon2id.
 */
export async function hashPassword(password: string): Promise<string> {
  return await hash(password, ARGON2_OPTIONS);
}

/**
 * Verify a plain text password against an Argon2id hash in constant time.
 */
export async function verifyPassword(hashString: string, password: string): Promise<boolean> {
  try {
    return await verify(hashString, password);
  } catch {
    return false;
  }
}

/**
 * Perform a dummy hash verification when a user is NOT found in the database.
 * This ensures the API response time is identical whether the email exists or not,
 * preventing account enumeration attacks.
 */
export async function performDummyVerification(password: string): Promise<void> {
  try {
    await verify(DUMMY_HASH, password);
  } catch {
    // Ignore error
  }
}

