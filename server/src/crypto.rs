//! Byte-compatible port of `src/lib/encryption.js`: AES-256-CBC, PKCS#7, stored as `<iv hex>:<cipher hex>`.
//! The key is the first 32 ASCII chars of base64(sha256(JWT_SECRET)), exactly as Node derives it.

use aes::cipher::{BlockDecryptMut, BlockEncryptMut, KeyIvInit, block_padding::Pkcs7};
use base64::Engine;
use sha2::{Digest, Sha256};

type Enc = cbc::Encryptor<aes::Aes256>;
type Dec = cbc::Decryptor<aes::Aes256>;

#[derive(Clone)]
pub struct FieldCipher {
    key: [u8; 32],
}

impl FieldCipher {
    pub fn new(jwt_secret: &str) -> Self {
        let digest = Sha256::digest(jwt_secret.as_bytes());
        let b64 = base64::engine::general_purpose::STANDARD.encode(digest);
        let mut key = [0u8; 32];
        key.copy_from_slice(&b64.as_bytes()[..32]);
        Self { key }
    }

    pub fn encrypt(&self, plain: &str) -> Option<String> {
        if plain.is_empty() {
            return None; // Node returns null for falsy input
        }
        let iv: [u8; 16] = rand::random();
        let cipher = Enc::new(&self.key.into(), &iv.into()).encrypt_padded_vec_mut::<Pkcs7>(plain.as_bytes());
        Some(format!("{}:{}", hex::encode(iv), hex::encode(cipher)))
    }

    pub fn decrypt(&self, stored: &str) -> Option<String> {
        if stored.is_empty() {
            return None;
        }
        // Node: first segment is the IV, the rest (re-joined on ':') is the ciphertext.
        let (iv_hex, data_hex) = stored.split_once(':')?;
        let iv: [u8; 16] = hex::decode(iv_hex).ok()?.try_into().ok()?;
        let data = hex::decode(data_hex).ok()?;
        let plain = Dec::new(&self.key.into(), &iv.into()).decrypt_padded_vec_mut::<Pkcs7>(&data).ok()?;
        String::from_utf8(plain).ok()
    }
}
