//! Values in fixtures/node-crypto.json were produced by the Node code (src/lib/encryption.js, src/lib/jwt.js).
//! Rust must read them unchanged, or encrypted DB fields and admin sessions break at cutover.

use aiyu_server::{crypto::FieldCipher, session::{SessionKeys, session_cookie}};

fn fixture() -> serde_json::Value {
    serde_json::from_str(include_str!("fixtures/node-crypto.json")).unwrap()
}

#[test]
fn decrypts_values_encrypted_by_node() {
    let f = fixture();
    let cipher = FieldCipher::new(f["secret"].as_str().unwrap());
    for item in f["encrypted"].as_array().unwrap() {
        assert_eq!(cipher.decrypt(item["cipher"].as_str().unwrap()).as_deref(), item["plain"].as_str());
    }
}

#[test]
fn encrypt_round_trips_and_matches_node_format() {
    let cipher = FieldCipher::new("fixture-secret-do-not-use");
    let stored = cipher.encrypt("ya29.token").unwrap();
    let (iv, data) = stored.split_once(':').unwrap();
    assert_eq!(iv.len(), 32);
    assert_eq!(data.len() % 32, 0);
    assert_eq!(cipher.decrypt(&stored).as_deref(), Some("ya29.token"));
    assert_eq!(cipher.encrypt(""), None);
}

#[test]
fn wrong_key_or_garbage_decrypts_to_none() {
    let f = fixture();
    let stored = f["encrypted"][0]["cipher"].as_str().unwrap();
    assert_eq!(FieldCipher::new("other-secret").decrypt(stored), None);
    assert_eq!(FieldCipher::new("x").decrypt("nothex:zz"), None);
    assert_eq!(FieldCipher::new("x").decrypt(""), None);
}

#[test]
fn verifies_node_signed_session_jwt() {
    let f = fixture();
    let keys = SessionKeys::new(f["secret"].as_str().unwrap());
    let token = f["jwt"].as_str().unwrap();
    // The fixture's 24h expiry has passed by the time tests run later, so check the signature + claims here.
    let claims = keys.verify_ignoring_exp(token).expect("node token must verify");
    assert_eq!(claims.jti.as_deref(), Some("00000000-0000-4000-8000-000000000000"));
    assert_eq!(claims.user["name"], "Admin");
    assert!(SessionKeys::new("other").verify_ignoring_exp(token).is_none());
}

#[test]
fn rejects_expired_and_accepts_fresh_tokens() {
    let keys = SessionKeys::new("s");
    let now = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs();
    let mut claims = aiyu_server::session::Claims {
        user: serde_json::json!({"name": "Admin"}),
        jti: Some("j".into()),
        expires: None,
        iat: Some(now),
        exp: now + 60,
    };
    assert!(keys.verify(&keys.sign(&claims).unwrap()).is_some());
    claims.exp = now - 1;
    assert!(keys.verify(&keys.sign(&claims).unwrap()).is_none());
}

#[test]
fn reads_session_cookie() {
    assert_eq!(session_cookie("a=1; session=tok.en; b=2"), Some("tok.en"));
    assert_eq!(session_cookie("sessionx=1"), None);
}
