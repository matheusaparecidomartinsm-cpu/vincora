import type { Metadata } from "next";
import "@fontsource-variable/ibm-plex-sans";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./globals.css";
import { AppHeader } from "@/components/ui/layout-parts";
import { ToastHost } from "@/components/ui/toast-host";

export const metadata: Metadata = {
  title: { default: "Facas Desenvolvimento", template: "%s · Facas Desenvolvimento" },
  description: "Faca de corte e vinco na medida, pronta para a produção. Ferramenta interna ProFood.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-bg text-text">
        <ToastHost>
          <AppHeader />
          {children}
        </ToastHost>
      </body>
    </html>
  );
}
