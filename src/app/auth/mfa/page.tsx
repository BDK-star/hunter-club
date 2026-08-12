import type { Metadata } from "next";
import Link from "next/link";

import { getInternalSessionPrincipal } from "@/platform/auth/internal-session";
import {
  createSupabaseServerClient,
  isSupabaseAuthConfigured,
} from "@/platform/auth/supabase-server";

import { TotpEnrollment, TotpVerificationForm } from "./totp-enrollment";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "二次认证",
};

const errorMessages: Readonly<Record<string, string>> = {
  identity_unsupported: "身份映射失败，请重新登录。",
  identity_unverified: "身份供应商没有返回已验证身份。",
  invalid_code: "请输入身份验证器显示的六位代码。",
  server_error: "二次认证暂时无法完成。",
  unavailable: "本环境尚未配置身份服务。",
  verify_failed: "代码错误、已过期，或验证器已失效。",
};

type MfaPageProps = Readonly<{
  searchParams: Promise<{ error?: string | string[] }>;
}>;

export default async function MfaPage({ searchParams }: MfaPageProps) {
  const error = single((await searchParams).error);
  let principal = null;
  try {
    principal = await getInternalSessionPrincipal();
  } catch {
    // The status view below keeps public navigation available.
  }

  let factorId: string | null = null;
  let currentLevel: "aal1" | "aal2" | null = null;
  if (principal && isSupabaseAuthConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      const [claims, factors] = await Promise.all([
        supabase.auth.getClaims(),
        supabase.auth.mfa.listFactors(),
      ]);
      currentLevel = claims.data?.claims?.aal === "aal2" ? "aal2" : "aal1";
      factorId = factors.data?.totp[0]?.id ?? null;
    } catch {
      // Render a recoverable status rather than blocking public pages.
    }
  }

  return (
    <main className="auth-page">
      <header className="site-header">
        <Link className="brand-mark" href="/" aria-label="Hunter Club 首页">
          <span>HC</span>
          <strong>Hunter Club</strong>
        </Link>
        <nav className="standard-nav" aria-label="标准导航">
          <Link href="/saloon">大厅</Link>
          <Link href="/library">资料库</Link>
          <Link href="/search">搜索</Link>
        </nav>
      </header>
      <section className="auth-ledger" aria-labelledby="mfa-title">
        <p className="eyebrow">PRIVILEGED LEDGER · AAL2</p>
        <h1 id="mfa-title">高权限操作，需要第二枚印章。</h1>
        <p className="lede">
          身份验证器代码只提交给 Supabase 验证；Hunter Club 不保存 TOTP
          密钥或验证码。
        </p>
        {error ? (
          <p className="auth-error" role="alert">
            {errorMessages[error] ?? "二次认证没有完成。"}
          </p>
        ) : null}
        {!principal ? (
          <p className="auth-notice">
            需要先完成普通登录。
            <br />
            <Link href="/auth?next=/auth/mfa">前往旅客登记册</Link>
          </p>
        ) : !isSupabaseAuthConfigured() ? (
          <p className="auth-notice">{errorMessages.unavailable}</p>
        ) : currentLevel === "aal2" ? (
          <p className="auth-notice" role="status">
            当前会话已经达到 AAL2。
            <br />
            <Link href="/editorial">进入编辑工作台</Link>
          </p>
        ) : factorId ? (
          <TotpVerificationForm
            factorId={factorId}
            label="验证并升级当前会话"
          />
        ) : (
          <TotpEnrollment />
        )}
      </section>
    </main>
  );
}

function single(value: string | string[] | undefined): string | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}
