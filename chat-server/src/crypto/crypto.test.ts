// oxlint-disable no-unused-vars
import { describe, it, expect } from "bun:test";
import { ed25519, x25519 } from "@noble/curves/ed25519.js";
import { deriveSessionKey } from "./session";
import { seal, open } from "./envelope";
import { buildCanonicalHeader } from "./canonical";

function edKeyPair() {
    const priv = ed25519.utils.randomSecretKey();
    const pub = ed25519.getPublicKey(priv);
    return { priv, pub };
}

function xKeyPair() {
    const priv = x25519.utils.randomSecretKey();
    const pub = x25519.getPublicKey(priv);
    return { priv, pub };
}

describe("session key derivation", () => {
    it("is symmetric: alice & bob derive the same key", () => {
        const alice = xKeyPair();
        const bob = xKeyPair();

        const kA = deriveSessionKey(alice.priv, bob.pub, 1, 2);
        const kB = deriveSessionKey(bob.priv, alice.pub, 1, 2);

        expect(kA.length).toBe(32);
        expect(Buffer.from(kA).toString("hex")).toBe(Buffer.from(kB).toString("hex"));
    });

    it("different user pairs yield different keys", () => {
        const priv1 = x25519.utils.randomSecretKey();
        const pub2 = x25519.getPublicKey(x25519.utils.randomSecretKey());

        const k12 = deriveSessionKey(priv1, pub2, 1, 2);
        const k13 = deriveSessionKey(priv1, pub2, 1, 3);

        expect(Buffer.from(k12).toString("hex")).not.toBe(Buffer.from(k13).toString("hex"));
    });
});

describe("envelope seal/open", () => {
    it("roundtrip: seal then open returns original plaintext", () => {
        const aliceEd = edKeyPair();
        const aliceX = xKeyPair();
        const bobEd = edKeyPair();
        const bobX = xKeyPair();

        const sk = deriveSessionKey(aliceX.priv, bobX.pub, 10, 20);
        const plaintext = new TextEncoder().encode("hello bob, this is alice");
        const ts = Date.now();

        const env = seal(plaintext, sk, aliceEd.priv, 10, 20, ts);

        const decrypted = open(env, sk, aliceEd.pub);
        expect(decrypted).not.toBeNull();
        expect(new TextDecoder().decode(decrypted!)).toBe("hello bob, this is alice");
    });

    it("tampered ciphertext fails to open", () => {
        const aliceEd = edKeyPair();
        const aliceX = xKeyPair();
        const bobEd = edKeyPair();
        const bobX = xKeyPair();

        const sk = deriveSessionKey(aliceX.priv, bobX.pub, 10, 20);
        const plaintext = new TextEncoder().encode("secret");
        const env = seal(plaintext, sk, aliceEd.priv, 10, 20, Date.now());

        env.ct[0] = env.ct[0]! ^ 0xff;
        const result = open(env, sk, aliceEd.pub);
        expect(result).toBeNull();
    });

    it("wrong public key fails signature verification", () => {
        const aliceEd = edKeyPair();
        const aliceX = xKeyPair();
        const bobEd = edKeyPair();
        const bobX = xKeyPair();
        const charlieEd = edKeyPair();

        const sk = deriveSessionKey(aliceX.priv, bobX.pub, 10, 20);
        const plaintext = new TextEncoder().encode("msg for bob");
        const env = seal(plaintext, sk, aliceEd.priv, 10, 20, Date.now());

        const result = open(env, sk, charlieEd.pub);
        expect(result).toBeNull();
    });

    it("wrong session key fails to decrypt", () => {
        const aliceEd = edKeyPair();
        const aliceX = xKeyPair();
        const _bobEd = edKeyPair();
        const bobX = xKeyPair();
        const charlieX = xKeyPair();

        const sk = deriveSessionKey(aliceX.priv, bobX.pub, 10, 20);
        const wrongSk = deriveSessionKey(aliceX.priv, charlieX.pub, 10, 20);
        const plaintext = new TextEncoder().encode("msg for bob");
        const env = seal(plaintext, sk, aliceEd.priv, 10, 20, Date.now());

        const result = open(env, wrongSk, aliceEd.pub);
        expect(result).toBeNull();
    });
});

describe("canonical header", () => {
    it("produces deterministic bytes for same inputs", () => {
        const h1 = buildCanonicalHeader(1, 2, 1700000000000, new Uint8Array(12));
        const h2 = buildCanonicalHeader(1, 2, 1700000000000, new Uint8Array(12));
        expect(Buffer.from(h1).toString("hex")).toBe(Buffer.from(h2).toString("hex"));
    });

    it("different inputs produce different bytes", () => {
        const h1 = buildCanonicalHeader(1, 2, 1700000000000, new Uint8Array(12));
        const h2 = buildCanonicalHeader(1, 3, 1700000000000, new Uint8Array(12));
        expect(Buffer.from(h1).toString("hex")).not.toBe(Buffer.from(h2).toString("hex"));
    });
});

describe("ed25519 signing", () => {
    it("sign + verify roundtrip", () => {
        const { priv, pub } = edKeyPair();
        const msg = new TextEncoder().encode("test message");

        const sig = ed25519.sign(msg, priv);
        expect(sig.length).toBe(64);
        expect(ed25519.verify(sig, msg, pub)).toBe(true);
    });

    it("wrong key fails verify", () => {
        const { priv } = edKeyPair();
        const { pub: wrongPub } = edKeyPair();
        const msg = new TextEncoder().encode("test");

        const sig = ed25519.sign(msg, priv);
        expect(ed25519.verify(sig, msg, wrongPub)).toBe(false);
    });
});
