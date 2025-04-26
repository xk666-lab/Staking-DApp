"use client";

import * as React from "react";
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from "next-themes";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const [mounted, setMounted] = React.useState(false);

  // 确保组件仅在客户端挂载后渲染
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // 避免主题切换时可能的水合误匹配
  if (!mounted) {
    return <div style={{ visibility: "hidden" }}>{children}</div>;
  }

  return (
    <NextThemesProvider {...props} enableSystem={false} attribute="class">
      {children}
    </NextThemesProvider>
  );
}
