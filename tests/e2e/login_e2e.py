"""E2E do login com respostas simuladas (sem senhas reais).

Uso: python3 tests/e2e/login_e2e.py [BASE_URL]   (padrão http://localhost:8080)
Cobre: senha errada + dica de maiúscula, aviso de espaço, 429, sem conexão,
sessão salva mantida em tempo esgotado, /version.json e recarga por versão nova.
Regras de Google/30 dias/admin estão nos testes unitários (sessionPolicy, loginHardening).
"""
import asyncio
import json
import sys
from playwright.async_api import async_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8080"
failures: list[str] = []


def check(cond: bool, name: str) -> None:
    print(("OK   " if cond else "FAIL ") + name)
    if not cond:
        failures.append(name)


async def fill_and_submit(page, email: str, password: str) -> None:
    await page.get_by_role("radio", name="Ordens de Serviço").click()
    await page.fill("#login-email", email)
    await page.fill("#login-password", password)
    await page.get_by_role("button", name="Entrar", exact=True).click()


async def main() -> None:
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)

        # /version.json sem cache
        ctx = await browser.new_context()
        page = await ctx.new_page()
        res = await page.request.get(f"{BASE}/version.json")
        body = await res.json()
        check(res.ok and isinstance(body.get("buildId"), str), "version.json responde buildId")
        check("no-store" in (res.headers.get("cache-control") or ""), "version.json no-store")
        await ctx.close()

        # Senha errada com maiúscula
        ctx = await browser.new_context()
        page = await ctx.new_page()
        await page.route("**/auth/v1/token?grant_type=password", lambda r: r.fulfill(status=400, content_type="application/json", body=json.dumps({"code": "invalid_credentials", "error_code": "invalid_credentials", "msg": "Invalid login credentials"})))
        await page.route("**/rest/v1/login_diagnostics*", lambda r: r.fulfill(status=201, body=""))
        await page.goto(f"{BASE}/login")
        await fill_and_submit(page, " Tec@Exemplo.com ", "Senha123!")
        await page.wait_for_selector("text=E-mail ou senha inválidos.")
        check(await page.locator("text=Confira se a primeira letra não ficou maiúscula").count() > 0, "dica de maiúscula após falha")
        attrs = await page.eval_on_selector("#login-password", "e => [e.getAttribute('autocapitalize'), e.getAttribute('autocorrect'), e.spellcheck]")
        check(attrs == ["off", "off", False], "senha sem maiúscula/correção automática")
        await page.fill("#login-password", "senha123 ")
        check(await page.locator("text=Sua senha tem espaço no início ou no fim.").count() > 0, "aviso de espaço na senha")
        await ctx.close()

        # Muitas tentativas
        ctx = await browser.new_context()
        page = await ctx.new_page()
        await page.route("**/auth/v1/token?grant_type=password", lambda r: r.fulfill(status=429, content_type="application/json", body=json.dumps({"code": "over_request_rate_limit", "msg": "Request rate limit reached"})))
        await page.route("**/rest/v1/login_diagnostics*", lambda r: r.fulfill(status=201, body=""))
        await page.goto(f"{BASE}/login")
        await fill_and_submit(page, "tec@exemplo.com", "senha123")
        check(await page.wait_for_selector("text=Muitas tentativas seguidas", timeout=8000) is not None, "mensagem de 429")
        await ctx.close()

        # Sem conexão
        ctx = await browser.new_context()
        page = await ctx.new_page()
        await page.route("**/auth/v1/token?grant_type=password", lambda r: r.abort("internetdisconnected"))
        await page.route("**/rest/v1/login_diagnostics*", lambda r: r.abort())
        await page.goto(f"{BASE}/login")
        await fill_and_submit(page, "tec@exemplo.com", "senha123")
        check(await page.wait_for_selector("text=Sem conexão com a internet", timeout=20000) is not None, "mensagem sem conexão")
        await ctx.close()

        # Tempo esgotado na leitura da sessão não apaga a sessão salva
        ctx = await browser.new_context()
        page = await ctx.new_page()
        await page.goto(f"{BASE}/login")
        key = await page.evaluate("Object.keys(localStorage).find(k=>/^sb-.+-auth-token$/.test(k)) || 'sb-lvsljgctwwovxcswtfwu-auth-token'")
        fake = {"access_token": "x", "refresh_token": "y", "expires_at": 1, "expires_in": 0, "token_type": "bearer", "user": {"id": "00000000-0000-0000-0000-000000000001"}}
        await page.evaluate("([k,v]) => localStorage.setItem(k, v)", [key, json.dumps(fake)])
        await page.route("**/auth/v1/token?grant_type=refresh_token", lambda r: r.abort("timedout"))
        await page.reload()
        await page.wait_for_timeout(10000)
        check(await page.evaluate("k => localStorage.getItem(k) !== null", key), "sessão mantida após falha de rede")
        await ctx.close()

        # Versão nova força recarga no /login
        ctx = await browser.new_context()
        page = await ctx.new_page()
        loads = {"n": 0}
        page.on("load", lambda _: loads.__setitem__("n", loads["n"] + 1))
        await page.goto(f"{BASE}/login")
        await page.wait_for_timeout(1500)
        before = loads["n"]
        await page.route("**/version.json*", lambda r: r.fulfill(status=200, content_type="application/json", body=json.dumps({"buildId": "versao-nova"})))
        await page.evaluate("window.dispatchEvent(new Event('focus'))")
        await page.wait_for_timeout(3000)
        check(loads["n"] > before, "nova versão recarrega o /login")
        await ctx.close()

        await browser.close()
    if failures:
        print(f"\n{len(failures)} falha(s)")
        sys.exit(1)
    print("\nTodos os cenários passaram")


asyncio.run(main())
