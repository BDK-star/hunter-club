import Link from "next/link";

import {
  getSaloonExperience,
  getSceneByRoute,
} from "@/modules/experience/public";

export default function HomePage() {
  const scene = getSceneByRoute("/");
  const experience = getSaloonExperience();
  const copy = {
    title: "推开那扇门，\n从一杯传闻开始。",
  };

  return (
    <main className="exterior-page">
      <header className="site-header">
        <Link className="brand-mark" href="/" aria-label="Hunter Club 首页">
          <span>HC</span>
          <strong>Hunter Club</strong>
        </Link>
        <nav className="standard-nav" aria-label="标准导航">
          <Link aria-current="page" href="/">
            门外
          </Link>
          <Link href="/saloon">大厅</Link>
          <Link href="/library">资料库</Link>
        </nav>
      </header>

      <section className="exterior-scene" aria-labelledby="exterior-title">
        <div className="moon" aria-hidden="true" />
        <div className="mesa mesa-left" aria-hidden="true" />
        <div className="mesa mesa-right" aria-hidden="true" />
        <div className="exterior-copy">
          <p className="eyebrow">PHASE 2 · SALOON EXTERIOR</p>
          <h1 id="exterior-title">
            {copy.title.split("\n").map((line) => (
              <span key={line}>{line}</span>
            ))}
          </h1>
          <p className="lede">{experience.copy[scene.descriptionKey]}</p>
        </div>

        <div className="saloon-stage">
          <div className="saloon-facade" aria-hidden="true">
            <div className="saloon-sign">HUNTER · CLUB</div>
            <div className="window window-left" />
            <div className="window window-right" />
          </div>

          <details className="entry-ledger">
            <summary className="saloon-door">
              <span className="door-star" aria-hidden="true">
                ✦
              </span>
              <span>推门</span>
              <small>ENTER THE SALOON</small>
            </summary>
            <div className="entry-panel">
              <p className="eyebrow">VISITOR LEDGER</p>
              <h2>先约定剧透边界</h2>
              <p>旅客可以直接进入；登录只为贡献内容和保存个人状态。</p>
              <Link className="secondary-action entry-auth" href="/auth">
                在旅客登记册登录
              </Link>
              <form action="/saloon" method="get">
                <fieldset>
                  <legend>本次浏览显示到哪里？</legend>
                  <label>
                    <input
                      defaultChecked
                      name="spoilers"
                      type="radio"
                      value="safe"
                    />
                    <span>低剧透</span>
                    <small>只显示入口与功能说明</small>
                  </label>
                  <label>
                    <input name="spoilers" type="radio" value="anime" />
                    <span>动画进度</span>
                    <small>允许动画范围提示</small>
                  </label>
                  <label>
                    <input name="spoilers" type="radio" value="manga" />
                    <span>漫画进度</span>
                    <small>允许漫画范围提示</small>
                  </label>
                </fieldset>
                <button className="primary-action" type="submit">
                  以旅客身份进入
                </button>
              </form>
            </div>
          </details>
        </div>
      </section>

      <footer className="scene-footer">
        <p>非官方网站 · 原创低保真场景 · 不使用官方图像与音频</p>
        <Link href="/saloon?spoilers=safe">跳过场景，直接进入大厅</Link>
      </footer>
    </main>
  );
}
