import { baseOptions } from "@/app/layout.config";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import { Album, BookOpenText, MessageCircleCode } from "lucide-react";
import type { ReactNode } from "react";

export default async function Layout({ params, children }: { params: Promise<{ lang: string }>; children: ReactNode }) {
  const { lang } = await params;

  return (
    <HomeLayout
      style={
        {
          "--spacing-fd-container": "1120px",
        } as object
      }
      {...baseOptions(lang)}
      links={[
        {
          icon: <BookOpenText />,
          text: "文档",
          url: "/docs/app",
          active: "nested-url",
        },
        {
          icon: <Album />,
          text: "下载",
          url: "/release",
          active: "nested-url",
        },
        {
          icon: <MessageCircleCode />,
          text: "论坛",
          url: "https://bbs.project-graph.top",
          active: "nested-url",
        },
      ]}
    >
      {children}
    </HomeLayout>
  );
}
