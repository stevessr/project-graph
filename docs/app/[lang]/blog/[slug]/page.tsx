import { blog } from "@/lib/source";
import { getMDXComponents } from "@/mdx-components";
import { DocsBody, DocsPage, DocsTitle } from "fumadocs-ui/page";
import { notFound } from "next/navigation";

export default async function Page(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const page = blog.getPage([params.slug]);
  if (!page) notFound();

  const MDXContent = page.data.body;

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <div className="flex flex-row items-center gap-2 border-b pt-2 pb-6">
        <img src={`https://github.com/${page.data.author}.png`} alt="" className="h-6 w-6 rounded-full" />
        <span>{page.data.author}</span>
        <span>{page.data.date.toLocaleDateString()}</span>
      </div>
      <DocsBody>
        <MDXContent components={getMDXComponents()} />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateMetadata(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const page = blog.getPage([params.slug]);
  if (!page) notFound();

  return {
    title: page.data.title,
    description: page.data.description,
  };
}
