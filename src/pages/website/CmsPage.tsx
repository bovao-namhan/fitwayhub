import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getApiBase } from "@/lib/api";
import SectionRenderer, { type CmsSection, LatestBlogsSection } from "@/components/cms/SectionRenderer";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/context/I18nContext";

export default function CmsPage({ page: pageProp }: { page?: string }) {
  const { page: pageParam } = useParams();
  const page = pageProp || pageParam || "home";
  const [sections, setSections] = useState<CmsSection[]>([]);
  const [loading, setLoading] = useState(true);
  const { lang, t } = useI18n();
  const hasBlogSection = sections.some(s => s.type === "latest_blogs");

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
        {t("no_content_yet")}
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
      {page === "home" && !hasBlogSection && <LatestBlogsSection lang={lang} />}
    </>
  );
}
