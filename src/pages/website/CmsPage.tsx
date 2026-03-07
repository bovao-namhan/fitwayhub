import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getApiBase } from "@/lib/api";
import SectionRenderer, { type CmsSection } from "@/components/cms/SectionRenderer";
import { Loader2 } from "lucide-react";

export default function CmsPage({ page: pageProp }: { page?: string }) {
  const { page: pageParam } = useParams();
  const page = pageProp || pageParam || "home";
  const [sections, setSections] = useState<CmsSection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${getApiBase()}/api/cms/sections/${encodeURIComponent(page)}`)
      .then(r => r.json())
      .then(d => setSections(d.sections || []))
      .catch(() => setSections([]))
      .finally(() => setLoading(false));
  }, [page]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <Loader2 size={28} className="spin" style={{ color: "var(--accent)" }} />
      </div>
    );
  }

  if (sections.length === 0) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", color: "var(--text-muted)", fontSize: 15 }}>
        No content yet.
      </div>
    );
  }

  return (
    <>
      {sections.map(s => (
        <div key={s.id}>
          <SectionRenderer section={s} />
        </div>
      ))}
    </>
  );
}
