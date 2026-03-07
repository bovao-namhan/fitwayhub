import BlogExperience from "@/components/app/BlogExperience";

export default function AdminBlogs() {
  return (
    <BlogExperience
      mode="admin"
      heading="No Pain No Shawerma"
      subheading="Manage platform articles, publish announcements, and curate long-form content."
      allowWriting
    />
  );
}
