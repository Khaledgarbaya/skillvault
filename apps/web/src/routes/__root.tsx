import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import appCss from "../styles/app.css?url";
import { SiteHeader } from "~/components/site-header";
import { SiteFooter } from "~/components/site-footer";
import { Toaster } from "~/components/ui/sonner";
import { PostHogProvider } from "~/components/posthog-provider";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      { title: "SKVault — skscan: Security Scanner for AI Agent Skills" },
      {
        name: "description",
        content:
          "Open-source security scanner for AI agent SKILL.md files. Catches prompt injection, secret leaks, dangerous code, and hidden instructions before they run.",
      },
      { name: "theme-color", content: "#09090b" },
      { property: "og:title", content: "SKVault — skscan: Security Scanner for AI Agent Skills" },
      {
        property: "og:description",
        content:
          "Open-source security scanner for AI agent SKILL.md files. Catches prompt injection, secret leaks, dangerous code, and hidden instructions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "SKVault — skscan: Security Scanner for AI Agent Skills" },
      {
        name: "twitter:description",
        content:
          "Open-source security scanner for AI agent SKILL.md files. Catches prompt injection, secret leaks, dangerous code, and hidden instructions.",
      },
    ],
    links: [
      { rel: "icon", href: "/favicon.ico", sizes: "32x32" },
      {
        rel: "icon",
        href: "/skvault-logo.svg",
        type: "image/svg+xml",
      },
      {
        rel: "apple-touch-icon",
        href: "/apple-touch-icon.png",
      },
      { rel: "manifest", href: "/site.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Geist:wght@300..900&family=JetBrains+Mono:wght@400;500;600;700&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  component: RootLayout,
});

function RootLayout() {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="flex min-h-screen flex-col font-sans">
        <PostHogProvider>
          <SiteHeader />
          <main className="flex-1">
            <Outlet />
          </main>
          <SiteFooter />
          <Toaster />
        </PostHogProvider>
        <Scripts />
      </body>
    </html>
  );
}
