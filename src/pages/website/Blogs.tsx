import React from "react";
import { useI18n } from "@/context/I18nContext";

export default function WebsiteBlogs() {
  const { t } = useI18n();

  const posts = [
    { id: 1, title: "No Pain No Champagne", excerpt: "Fitness stories and tips to celebrate progress." },
    { id: 2, title: "No Pain No Shawarma", excerpt: "Post-workout recovery and food motivation." },
  ];

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 28, fontWeight: 700 }}>No Pain No Champagne / No Pain No Shawarma</h1>
      <p style={{ color: "var(--text-muted)", marginTop: 8 }}>{t("blogs_description") || "Our blog — fitness tips, coach stories and recipes."}</p>

      <div style={{ marginTop: 20, display: "grid", gap: 12 }}>
        {posts.map(p => (
          <article key={p.id} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{p.title}</h2>
            <p style={{ marginTop: 8, color: "var(--text-muted)" }}>{p.excerpt}</p>
            <a href="#" onClick={e => e.preventDefault()} style={{ marginTop: 10, display: "inline-block", color: "var(--accent)" }}>Read more →</a>
          </article>
        ))}
      </div>
    </div>
  );
}
