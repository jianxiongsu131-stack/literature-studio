import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "研迹 · 文献研究工作台",
  description: "以主题、文献、AI 摘要和结构化记录组织毕业论文研究的本地工作台。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
