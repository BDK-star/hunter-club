import type { Metadata } from "next";
import Link from "next/link";

import { isSupabaseAuthConfigured } from "@/platform/auth/supabase-server";
import { getInternalSessionPrincipal } from "@/platform/auth/internal-session";

import {
  requestEmailOtp,
  signInWithGitHub,
  signOut,
  verifyEmailOtp,
} from "./actions";

export const metadata: Metadata = { title: "旅客登记" };

const errorMessages: Readonly<Record<string, string>> = {
  exchange_failed: "登录凭证交换失败，请重新推门。",
  github_failed: "GitHub 暂时没有回应，请稍后重试。",
  identity_unsupported: "这个身份供应商尚未被酒馆接受。",
  identity_unverified: "身份尚未通过服务器验证。",
  invalid_email: "请填写有效的邮箱地址。",
  invalid_otp: "请填写邮箱和六位验证码。",
  missing_code: "回调缺少登录凭证，请重新开始。",
  otp_failed: "验证码邮件未能发送，请稍后重试。",
  otp_verify_failed: "验证码错误或已过期，请重新发送。",
  server_error: "登记册暂时无法写入；公开资料仍可浏览。",
  unavailable: "身份服务尚未配置；请先以旅客身份进入。",
};

type AuthPageProps = Readonly<{
  searchParams: Promise<{
    error?: string | string[];
    next?: string | string[];
    sent?: string | string[];
  }>;
}>;

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const parameters = await searchParams;
  const errorCode = singleValue(parameters.error);
  const nextPath = safeNextPath(singleValue(parameters.next));
  const configured = isSupabaseAuthConfigured();
  const signedIn = await hasActiveSession();

  return (
    <main className="auth-page">
      <header className="site-header">
        <Link className="brand-mark" href="/" aria-label="Hunter Club 首页">
          <span>HC</span>
          <strong>Hunter Club</strong>
        </Link>
        <nav className="standard-nav" aria-label="标准导航">
          <Link href="/">门外</Link>
          <Link href="/saloon">大厅</Link>
          <Link href="/library">资料库</Link>
          <Link href="/search">搜索</Link>
        </nav>
      </header>

      <section className="auth-ledger" aria-labelledby="auth-title">
        <p className="eyebrow">VISITOR LEDGER · 旅客登记册</p>
        <h1 id="auth-title">留下代号，再推门。</h1>
        <p className="lede">
          登录只用于贡献、个人状态与高权限操作。公开资料和酒吧大厅永远保留旅客入口。
        </p>

        {singleValue(parameters.sent) === "1" ? (
          <p className="auth-notice" role="status">
            验证码已发出。请检查邮箱，并在下方输入六位数字。
          </p>
        ) : null}
        {errorCode ? (
          <p className="auth-error" role="alert">
            {errorMessages[errorCode] ?? "登录没有完成，请重新尝试。"}
          </p>
        ) : null}

        {signedIn ? (
          <div className="auth-options">
            <p className="auth-notice" role="status">
              登记有效。你可以继续进入大厅，或撤销当前设备的会话。
            </p>
            <Link className="primary-action" href="/auth/mfa">
              设置或验证二次认证
            </Link>
            <form action={signOut}>
              <button className="secondary-action auth-github" type="submit">
                注销当前设备
              </button>
            </form>
          </div>
        ) : configured ? (
          <div className="auth-options">
            <form action={requestEmailOtp} className="auth-form">
              <input name="next" type="hidden" value={nextPath} />
              <label htmlFor="auth-email">邮箱验证码</label>
              <div className="auth-field-row">
                <input
                  autoComplete="email"
                  id="auth-email"
                  inputMode="email"
                  maxLength={320}
                  name="email"
                  placeholder="hunter@example.com"
                  required
                  type="email"
                />
                <button className="primary-action" type="submit">
                  发送验证邮件
                </button>
              </div>
              <small>试运行若未配置自定义 SMTP，只能投递到项目团队邮箱。</small>
            </form>

            <form action={verifyEmailOtp} className="auth-form auth-otp-form">
              <input name="next" type="hidden" value={nextPath} />
              <label htmlFor="verify-email">输入邮箱验证码</label>
              <input
                autoComplete="email"
                id="verify-email"
                maxLength={320}
                name="email"
                placeholder="再次填写邮箱"
                required
                type="email"
              />
              <div className="auth-field-row">
                <input
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  maxLength={6}
                  minLength={6}
                  name="token"
                  pattern="[0-9]{6}"
                  placeholder="000000"
                  required
                  type="text"
                />
                <button className="primary-action" type="submit">
                  验证并进入
                </button>
              </div>
            </form>

            <div className="auth-divider" role="separator">
              <span>或者</span>
            </div>

            <form action={signInWithGitHub}>
              <input name="next" type="hidden" value={nextPath} />
              <button className="secondary-action auth-github" type="submit">
                使用 GitHub 登记
              </button>
            </form>
          </div>
        ) : (
          <p className="auth-notice" role="status">
            本环境尚未配置 Supabase
            Auth。数据库和公开阅读正常，登录入口暂不发送请求。
          </p>
        )}

        <div className="auth-exits">
          <Link className="primary-action" href="/saloon?spoilers=safe">
            以旅客身份进入
          </Link>
          <Link href="/">回到酒吧门外</Link>
        </div>
      </section>
    </main>
  );
}

function singleValue(value: string | string[] | undefined): string | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

function safeNextPath(candidate: string | null): string {
  return candidate?.startsWith("/") && !candidate.startsWith("//")
    ? candidate
    : "/saloon";
}

async function hasActiveSession(): Promise<boolean> {
  try {
    return (await getInternalSessionPrincipal()) !== null;
  } catch {
    return false;
  }
}
