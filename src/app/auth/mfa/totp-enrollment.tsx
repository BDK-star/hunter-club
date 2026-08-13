"use client";

import Image from "next/image";
import { useActionState } from "react";

import { enrollTotp, verifyTotp, type TotpEnrollmentState } from "./actions";

const initialState: TotpEnrollmentState = {
  factorId: null,
  issue: null,
  qrCodeDataUrl: null,
  secret: null,
};

export function TotpEnrollment() {
  const [state, action, pending] = useActionState(enrollTotp, initialState);

  if (!state.factorId || !state.qrCodeDataUrl || !state.secret) {
    return (
      <form action={action} className="auth-form">
        {state.issue ? (
          <p className="auth-error" role="alert">
            无法开始设置：{state.issue}
          </p>
        ) : null}
        <button className="primary-action" disabled={pending} type="submit">
          {pending ? "正在准备…" : "设置身份验证器"}
        </button>
      </form>
    );
  }

  return (
    <div className="mfa-enrollment">
      <Image
        alt="Hunter Club TOTP 二维码"
        height={220}
        src={state.qrCodeDataUrl}
        unoptimized
        width={220}
      />
      <p>无法扫码时，手动输入密钥：</p>
      <code>{state.secret}</code>
      <TotpVerificationForm
        factorId={state.factorId}
        label="验证并启用二次认证"
      />
    </div>
  );
}

export function TotpVerificationForm({
  factorId,
  label,
}: Readonly<{ factorId: string; label: string }>) {
  return (
    <form action={verifyTotp} className="auth-form auth-otp-form">
      <input name="factorId" type="hidden" value={factorId} />
      <label htmlFor={`totp-${factorId}`}>身份验证器六位代码</label>
      <div className="auth-field-row">
        <input
          autoComplete="one-time-code"
          id={`totp-${factorId}`}
          inputMode="numeric"
          maxLength={6}
          minLength={6}
          name="code"
          pattern="[0-9]{6}"
          required
          type="text"
        />
        <button className="primary-action" type="submit">
          {label}
        </button>
      </div>
    </form>
  );
}
