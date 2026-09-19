import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./presentation/App";
import { ErrorBoundary } from "./presentation/components/common/ErrorBoundary";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
