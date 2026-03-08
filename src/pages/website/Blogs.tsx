import BlogExperience from "@/components/app/BlogExperience";
import { useI18n } from "@/context/I18nContext";

export default function WebsiteBlogs() {
  const { t } = useI18n();

  return (
    <BlogExperience
      mode="website"
      heading={t("blog_title")}
      subheading={t("blog_subheading")}
    />
  );
}
