import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AuthTimeoutError,
  clearLocalAuthSession,
  createOnceGuard,
  isAuthTimeout,
  withTimeout,
} from "./withTimeout";

afterEach(() => vi.useRealTimers());

describe("withTimeout", () => {
  it("resolve quando a promise termina antes", async () => {
    await expect(withTimeout(Promise.resolve(5), 100, "x")).resolves.toBe(5);
  });

  it("rejeita com AuthTimeoutError quando passa do tempo", async () => {
    vi.useFakeTimers();
    const p = withTimeout(new Promise(() => {}), 15_000, "signIn");
    vi.advanceTimersByTime(15_000);
    await expect(p).rejects.toBeInstanceOf(AuthTimeoutError);
    await p.catch((e) => {
      expect(isAuthTimeout(e)).toBe(true);
      expect(e.stage).toBe("signIn");
    });
  });

  it("propaga o erro original", async () => {
    const err = new Error("boom");
    await expect(withTimeout(Promise.reject(err), 100, "x")).rejects.toBe(err);
  });

  it("limpa o timer ao resolver", async () => {
    vi.useFakeTimers();
    const spy = vi.spyOn(globalThis, "clearTimeout");
    await withTimeout(Promise.resolve(1), 1000, "x");
    expect(spy).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("createOnceGuard", () => {
  it("dispara uma vez por usuário até reset", () => {
    const g = createOnceGuard();
    expect(g.tryAcquire("u1")).toBe(true);
    expect(g.tryAcquire("u1")).toBe(false);
    g.reset();
    expect(g.tryAcquire("u1")).toBe(true);
  });
});

describe("clearLocalAuthSession", () => {
  function memStorage(): Storage {
    const m = new Map<string, string>();
    return {
      get length() {
        return m.size;
      },
      key: (i) => Array.from(m.keys())[i] ?? null,
      getItem: (k) => m.get(k) ?? null,
      setItem: (k, v) => void m.set(k, String(v)),
      removeItem: (k) => void m.delete(k),
      clear: () => m.clear(),
    };
  }

  it("remove só as chaves sb-*-auth-token", () => {
    const ls = memStorage();
    const ss = memStorage();
    vi.stubGlobal("localStorage", ls);
    vi.stubGlobal("sessionStorage", ss);
    ls.setItem("sb-abc-auth-token", "x");
    ls.setItem("sb-abc-auth-token-code-verifier", "y");
    ls.setItem("lemarc:preferred-module", "os");
    ss.setItem("sb-abc-auth-token", "z");
    expect(clearLocalAuthSession()).toBe(3);
    expect(ls.getItem("lemarc:preferred-module")).toBe("os");
    expect(ls.length).toBe(1);
    expect(ss.length).toBe(0);
    vi.unstubAllGlobals();
  });
});
