import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
  useRouterState,
} from "@tanstack/react-router";
import appCss from "../styles/app.css?url";
import { SiteHeader } from "~/components/site-header";
import { SiteFooter } from "~/components/site-footer";
import { Toaster } from "~/components/ui/sonner";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      { title: "SKVault — Skill Registry for AI Agents" },
      { name: "theme-color", content: "#09090b" },
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
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isDashboard = pathname.startsWith("/dashboard");

  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="flex min-h-screen flex-col font-sans">
        {!isDashboard && <SiteHeader />}
        <main className="flex-1">
          <Outlet />
        </main>
        {!isDashboard && <SiteFooter />}
        <Toaster />
        <Scripts />
      </body>
    </html>
  );
}
