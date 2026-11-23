//! Port of `src/lib/jwt.js`: the `session` cookie is an HS256 JWT signed with the raw JWT_SECRET bytes.
//! The DB `Session` row check (revocation) is added with the data layer.

use jsonwebtoken::{Algorithm, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub user: serde_json::Value,
    pub jti: Option<String>,
    pub expires: Option<String>,
    pub iat: Option<u64>,
    pub exp: u64,
}

#[derive(Clone)]
pub struct SessionKeys {
    enc: EncodingKey,
    dec: DecodingKey,
}

impl SessionKeys {
    pub fn new(jwt_secret: &str) -> Self {
        Self {
            enc: EncodingKey::from_secret(jwt_secret.as_bytes()),
            dec: DecodingKey::from_secret(jwt_secret.as_bytes()),
        }
    }

    /// Verify signature and expiry, as `jwtVerify(input, key, { algorithms: ['HS256'] })` does.
    pub fn verify(&self, token: &str) -> Option<Claims> {
        self.verify_with(token, true)
    }

    /// Signature and claims only; for fixtures signed long ago.
    pub fn verify_ignoring_exp(&self, token: &str) -> Option<Claims> {
        self.verify_with(token, false)
    }

    fn verify_with(&self, token: &str, check_exp: bool) -> Option<Claims> {
        let mut v = Validation::new(Algorithm::HS256);
        v.validate_exp = check_exp;
        v.leeway = 0;
        v.required_spec_claims.clear();
        jsonwebtoken::decode::<Claims>(token, &self.dec, &v).ok().map(|d| d.claims)
    }

    pub fn sign(&self, claims: &Claims) -> anyhow::Result<String> {
        Ok(jsonwebtoken::encode(&Header::new(Algorithm::HS256), claims, &self.enc)?)
    }
}

/// Extract the `session` cookie from a Cookie header.
pub fn session_cookie(cookie_header: &str) -> Option<&str> {
    cookie_header
        .split(';')
        .filter_map(|p| p.trim().split_once('='))
        .find(|(k, _)| *k == "session")
        .map(|(_, v)| v)
}

/// Compare secrets without leaking where they differ.
pub fn constant_time_eq(a: &str, b: &str) -> bool {
    a.len() == b.len() && a.bytes().zip(b.bytes()).fold(0u8, |acc, (x, y)| acc | (x ^ y)) == 0
}
