import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "./lib/queryClient";
import { AuthProvider } from "./context/AuthContext";
import { App } from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
