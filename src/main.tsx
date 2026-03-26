import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/700.css";
import "@fontsource/space-mono/400.css";
import "@fontsource/space-mono/700.css";
import App from "./app/App";
import { AppErrorBoundary } from "./components/ErrorBoundaries";
import "./app/app.css";
import { registerSW } from "virtual:pwa-register";

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  registerSW({
    immediate: true,
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>,
);
