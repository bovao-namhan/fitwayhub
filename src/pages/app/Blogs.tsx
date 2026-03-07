import React from "react";
import { Link } from "react-router-dom";

export default function AppBlogs() {
  const posts = [
    { id: 1, title: "No Pain No Champagne", excerpt: "Quick wins, workout plans and celebration tips." },
    { id: 2, title: "No Pain No Shawarma", excerpt: "Nutrition notes and indulgence-friendly recipes." },
  ];

  return (
    <div style={{ padding: 20 }}>
      <h1>No Pain No Champagne / No Pain No Shawarma</h1>
      <div style={{ marginTop: 16 }}>
        {posts.map(p => (
          <div key={p.id} style={{ padding: 12, borderBottom: "1px solid #e6e6e6" }}>
            <h3 style={{ margin: 0 }}>{p.title}</h3>
            <p style={{ marginTop: 6, color: "#666" }}>{p.excerpt}</p>
            <Link to="#" onClick={e => e.preventDefault()}>Open</Link>
          </div>
        ))}
      </div>
    </div>
  );
}
