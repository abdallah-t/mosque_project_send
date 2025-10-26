import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MqttProvider } from "./contexts/MqttContext";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import ESP32Setup from "./pages/ESP32Setup";
import Clock from "./pages/Clock";
import PrayerAutomation from "./pages/PrayerAutomation";
import NotFound from "./pages/NotFound";
import "@/services/automationService"; // Auto-start automation service

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = localStorage.getItem('authenticated') === 'true';
  return isAuthenticated ? <>{children}</> : <Navigate to="/" replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <MqttProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Auth />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/esp32-setup"
              element={
                <ProtectedRoute>
                  <ESP32Setup />
                </ProtectedRoute>
              }
            />
            <Route
              path="/clock"
              element={
                <ProtectedRoute>
                  <Clock />
                </ProtectedRoute>
              }
            />
            <Route
              path="/prayer-automation"
              element={
                <ProtectedRoute>
                  <PrayerAutomation />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </MqttProvider>
  </QueryClientProvider>
);

export default App;
