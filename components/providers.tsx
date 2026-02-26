"use client";

import { ThemeProvider } from "@/components/theme-provider";
import { GlobalProvider } from "@/lib/context";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
            <GlobalProvider>
                {children}
            </GlobalProvider>
        </ThemeProvider>
    );
}
