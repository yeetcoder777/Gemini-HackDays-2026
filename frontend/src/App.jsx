import { useState, useEffect } from "react";
import ChatPage from "./components/ChatPage";
import Sidebar from "./components/Sidebar";
import EmotionGraph from "./components/EmotionGraph";
import AuthPage from "./components/AuthPage";

export default function App() {
  const [currentView, setCurrentView] = useState("chat");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check for existing token
    const token = localStorage.getItem("auth_token");
    const savedUser = localStorage.getItem("user");
    if (token) {
      setIsAuthenticated(true);
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    }
  }, []);

  const handleLogin = (userData) => {
    setIsAuthenticated(true);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user");
    setIsAuthenticated(false);
    setUser(null);
  };

  const styles = {
    appContainer: {
      display: "flex",
      height: "100vh",
      width: "100vw",
      overflow: "hidden",
      backgroundColor: "var(--background)",
    },
    contentArea: {
      flex: 1,
      height: "100%",
      position: "relative",
      overflow: "hidden",
    },
  };

  if (!isAuthenticated) {
    return <AuthPage onLogin={handleLogin} />;
  }

  return (
    <div style={styles.appContainer}>
      <Sidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        onLogout={handleLogout}
        user={user}
      />

      <div style={styles.contentArea}>
        {currentView === "chat" ? (
          <ChatPage />
        ) : (
          <EmotionGraph />
        )}
      </div>
    </div>
  );
}
