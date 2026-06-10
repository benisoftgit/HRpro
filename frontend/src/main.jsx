import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: "#1e293b",
            color: "#f8fafc",
            fontSize: "14px",
            borderRadius: "10px",
          },
          success: {
            iconTheme: { primary: "#22c55e", secondary: "#f8fafc" },
          },
          error: {
            iconTheme: { primary: "#ef4444", secondary: "#f8fafc" },
          },
        }}
      />
    </QueryClientProvider>
  </React.StrictMode>
);
