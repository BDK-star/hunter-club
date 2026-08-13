import type { CSSProperties } from "react";
import Link from "next/link";

import {
  getDialogueById,
  getSaloonExperience,
  getSceneByRoute,
  NpcDialogue,
  parseSpoilerLevel,
  resolveCapability,
} from "@/modules/experience/public";

export const metadata = {
  description: "Hunter Club 酒吧大厅：通过可访问的 NPC 对话进入站内功能。",
  title: "酒吧大厅",
};

const spoilerLabels = {
  anime: "动画进度",
  manga: "漫画进度",
  safe: "低剧透",
} as const;

type SaloonPageProps = Readonly<{
  searchParams: Promise<{ spoilers?: string | string[] }>;
}>;

export default async function SaloonPage({ searchParams }: SaloonPageProps) {
  const parameters = await searchParams;
  const spoilerLevel = parseSpoilerLevel(parameters.spoilers);
  const experience = getSaloonExperience();
  const scene = getSceneByRoute("/saloon");
  const exit = scene.hotspots.find((hotspot) => hotspot.kind === "exit");

  return (
    <main className="hall-page">
      <header className="site-header hall-header">
        <Link className="brand-mark" href="/" aria-label="Hunter Club 首页">
          <span>HC</span>
          <strong>Hunter Club</strong>
        </Link>
        <nav className="standard-nav" aria-label="标准导航">
          <Link href="/">门外</Link>
          <Link aria-current="page" href={`/saloon?spoilers=${spoilerLevel}`}>
            大厅
          </Link>
          <Link href="/library">资料库</Link>
          <Link href="/search">搜索</Link>
        </nav>
        <details className="spoiler-control">
          <summary>剧透：{spoilerLabels[spoilerLevel]}</summary>
          <form action="/saloon" method="get">
            {Object.entries(spoilerLabels).map(([value, label]) => (
              <label key={value}>
                <input
                  defaultChecked={value === spoilerLevel}
                  name="spoilers"
                  type="radio"
                  value={value}
                />
                {label}
              </label>
            ))}
            <button type="submit">应用</button>
          </form>
        </details>
      </header>

      <section className="hall-intro" aria-labelledby="hall-title">
        <p className="eyebrow">SCENE 02 · MAIN HALL</p>
        <h1 id="hall-title">今夜，先问路，再谈冒险。</h1>
        <p>{experience.copy[scene.descriptionKey]}</p>
      </section>

      <section
        className="hall-scene"
        aria-label={experience.copy[scene.labelKey]}
      >
        <div className="ceiling-beams" aria-hidden="true" />
        <div className="back-bar" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="bar-counter" aria-hidden="true" />
        <div className="floor-lines" aria-hidden="true" />

        <ol className="npc-list">
          {scene.npcs.map((npc) => {
            const dialogue = getDialogueById(npc.dialogueId);
            const style = {
              "--npc-x": `${npc.position.x}%`,
              "--npc-y": `${npc.position.y}%`,
            } as CSSProperties;

            return (
              <li
                className="npc-position"
                id={`npc-${npc.id}`}
                key={npc.id}
                style={style}
              >
                <details className="npc-card">
                  <summary>
                    <span
                      className={`npc-sigil npc-${npc.id}`}
                      aria-hidden="true"
                    >
                      {npc.sigil}
                    </span>
                    <span className="npc-identity">
                      <strong>{experience.copy[npc.nameKey]}</strong>
                      <small>{experience.copy[npc.roleKey]}</small>
                    </span>
                  </summary>
                  <NpcDialogue copy={experience.copy} dialogue={dialogue} />
                </details>
              </li>
            );
          })}
        </ol>

        {exit?.kind === "exit" ? (
          <Link
            className="hall-exit"
            href={resolveCapability(exit.action).href}
          >
            ← {experience.copy[exit.labelKey]}
          </Link>
        ) : null}
      </section>

      <nav className="fallback-navigation" aria-label="文字版功能导航">
        <div>
          <p className="eyebrow">STATIC FALLBACK</p>
          <h2>不使用场景也能到达</h2>
        </div>
        <Link href="/library">资料库导览</Link>
        <span aria-disabled="true">念能力测试 · 后续阶段</span>
        <span aria-disabled="true">社区任务 · 后续阶段</span>
      </nav>
    </main>
  );
}
