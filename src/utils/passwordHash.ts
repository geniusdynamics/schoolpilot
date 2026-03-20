/**
 * Password Hashing Utility
 * 
 * Uses Web Crypto API for secure password hashing with PBKDF2.
 * This is a pure JavaScript implementation suitable for browser environments.
 * 
 * For standalone mode (PouchDB/IndexedDB), this provides sufficient security.
 * For networked/hosted modes, passwords should be hashed server-side with bcrypt/argon2.
 */

export interface HashedPassword {
  hash: string;
  salt: string;
  iterations: number;
}

/**
 * Generate a random salt
 */
function generateSalt(length: number = 16): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash a password using PBKDF2 with SHA-256
 */
export async function hashPassword(
  password: string,
  iterations: number = 100000
): Promise<HashedPassword> {
  const salt = generateSalt();
  
  // Encode password and salt
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);
  const saltData = encoder.encode(salt);
  
  // Import key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordData,
    'PBKDF2',
    false,
    ['deriveBits']
  );
  
  // Derive bits using PBKDF2
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltData,
      iterations,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );
  
  // Convert to hex string
  const hashArray = new Uint8Array(derivedBits);
  const hash = Array.from(hashArray, byte => byte.toString(16).padStart(2, '0')).join('');
  
  return {
    hash,
    salt,
    iterations
  };
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(
  password: string,
  hashedPassword: HashedPassword
): Promise<boolean> {
  try {
    const { hash, salt, iterations } = hashedPassword;
    
    // Encode password and salt
    const encoder = new TextEncoder();
    const passwordData = encoder.encode(password);
    const saltData = encoder.encode(salt);
    
    // Import key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordData,
      'PBKDF2',
      false,
      ['deriveBits']
    );
    
    // Derive bits using PBKDF2 with same parameters
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltData,
        iterations,
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    );
    
    // Convert to hex string
    const hashArray = new Uint8Array(derivedBits);
    const computedHash = Array.from(hashArray, byte => byte.toString(16).padStart(2, '0')).join('');
    
    // Constant-time comparison to prevent timing attacks
    if (computedHash.length !== hash.length) {
      return false;
    }
    
    let result = 0;
    for (let i = 0; i < computedHash.length; i++) {
      result |= computedHash.charCodeAt(i) ^ hash.charCodeAt(i);
    }
    
    return result === 0;
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
}

/**
 * Generate a secure random token
 */
export function generateSecureToken(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Check if a password meets complexity requirements
 */
export function checkPasswordComplexity(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*()_+=[\]{};':"\\|,.<>?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
