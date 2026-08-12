import type { Metadata } from "next";
import Link from "next/link";

import { getInternalSessionPrincipal } from "@/platform/auth/internal-session";
import { loadRuntimeEditorialQueue } from "@/platform/publishing/runtime";

import { approveRevision, publishRevision } from "./actions";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "编辑工作台",
};

type EditorialPageProps = Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

const issueMessages: Readonly<Record<string, string>> = {
  authentication_required: "需要先登录编辑账号。",
  capability_missing: "当前账号没有内容审核权限。",
  invalid_publish: "发布理由或修订编号无效。",
  invalid_review: "审核理由或修订编号无效。",
  second_factor_required: "编辑操作要求二次认证（AAL2）。",
  server_error: "编辑服务暂时不可用；没有内容被更改。",
};

export default async function EditorialPage({
  searchParams,
}: EditorialPageProps) {
  const parameters = await searchParams;
  const error = single(parameters.error);
  let principal = null;
  try {
    principal = await getInternalSessionPrincipal();
  } catch {
    return <EditorialStatus message={issueMessages.server_error!} />;
  }
  if (!principal) {
    return (
      <EditorialStatus message={issueMessages.authentication_required!}>
        <Link className="primary-action" href="/auth?next=/editorial">
          前往旅客登记册
        </Link>
      </EditorialStatus>
    );
  }

  const queue = await loadRuntimeEditorialQueue(principal);
  if (!queue.ok) {
    return (
      <EditorialStatus message={issueMessages[queue.issue] ?? queue.issue}>
        {queue.issue === "second_factor_required" ? (
          <Link className="primary-action" href="/auth/mfa">
            完成二次认证
          </Link>
        ) : null}
      </EditorialStatus>
    );
  }

  return (
    <main className="editorial-page">
      <EditorialHeader />
      <section
        className="editorial-workbench"
        aria-labelledby="editorial-title"
      >
        <header>
          <p className="eyebrow">EDITORIAL DESK · REVISION CONTROL</p>
          <h1 id="editorial-title">先看差异，再落印章。</h1>
          <p className="lede">
            草稿、审核与发布记录只追加；发布操作只移动已验证指针。
          </p>
        </header>

        {error ? (
          <p className="auth-error" role="alert">
            {issueMessages[error] ?? `操作被拒绝：${error}`}
          </p>
        ) : null}
        {single(parameters.reviewed) === "1" ? (
          <p className="auth-notice" role="status">
            审核决定已写入审计记录。
          </p>
        ) : null}
        {single(parameters.published) === "1" ? (
          <p className="auth-notice" role="status">
            修订已发布，公开搜索投影已重建。
          </p>
        ) : null}

        {queue.items.length === 0 ? (
          <p className="search-empty">当前没有等待处理的新修订。</p>
        ) : (
          <ol className="editorial-queue">
            {queue.items.map((item) => (
              <li key={item.revisionId}>
                <header>
                  <p className="eyebrow">
                    {item.targetKind} · REVISION {item.sequence}
                  </p>
                  <h2>{item.slug}</h2>
                  <p>{item.changeSummary}</p>
                  <small>
                    当前审核：{item.latestReviewDecision ?? "尚未审核"}
                  </small>
                </header>
                <div
                  className="revision-diff"
                  role="region"
                  aria-label={`${item.slug} 修订差异`}
                >
                  {item.differences.length === 0 ? (
                    <p>快照内容没有可见差异。</p>
                  ) : (
                    <table>
                      <thead>
                        <tr>
                          <th>字段</th>
                          <th>当前发布</th>
                          <th>候选草稿</th>
                        </tr>
                      </thead>
                      <tbody>
                        {item.differences.map((difference) => (
                          <tr key={difference.path}>
                            <th scope="row">{difference.path}</th>
                            <td>{difference.before ?? "—"}</td>
                            <td>{difference.after ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                <div className="editorial-actions">
                  <form action={approveRevision}>
                    <input
                      name="revisionId"
                      type="hidden"
                      value={item.revisionId}
                    />
                    <label>
                      审核理由
                      <textarea
                        maxLength={1000}
                        minLength={5}
                        name="reason"
                        required
                        defaultValue="来源、正典状态和剧透边界已核对"
                      />
                    </label>
                    <button className="secondary-action" type="submit">
                      批准修订
                    </button>
                  </form>
                  <form action={publishRevision}>
                    <input
                      name="revisionId"
                      type="hidden"
                      value={item.revisionId}
                    />
                    <label>
                      发布理由
                      <textarea
                        maxLength={1000}
                        minLength={5}
                        name="reason"
                        required
                        defaultValue="发布已批准的带来源资料"
                      />
                    </label>
                    <button
                      className="primary-action"
                      disabled={item.latestReviewDecision !== "approved"}
                      type="submit"
                    >
                      发布到资料库
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}

function EditorialHeader() {
  return (
    <header className="site-header library-header">
      <Link className="brand-mark" href="/" aria-label="Hunter Club 首页">
        <span>HC</span>
        <strong>Hunter Club</strong>
      </Link>
      <nav className="standard-nav" aria-label="标准导航">
        <Link href="/saloon">大厅</Link>
        <Link href="/library">资料库</Link>
        <Link href="/search">搜索</Link>
        <Link aria-current="page" href="/editorial">
          编辑台
        </Link>
      </nav>
    </header>
  );
}

function EditorialStatus({
  children,
  message,
}: Readonly<{ children?: React.ReactNode; message: string }>) {
  return (
    <main className="editorial-page">
      <EditorialHeader />
      <section className="editorial-workbench">
        <p className="eyebrow">EDITORIAL DESK</p>
        <h1>编辑台暂未开锁。</h1>
        <p className="lede">{message}</p>
        {children}
      </section>
    </main>
  );
}

function single(value: string | string[] | undefined): string | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}
