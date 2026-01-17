import { MessageSquare, BarChart2, Settings, LogOut, User } from "lucide-react";

export default function Sidebar({ currentView, onViewChange, onLogout, user }) {
  const styles = {
    container: {
      width: "60px",
      backgroundColor: "var(--card)",
      borderRight: "1px solid var(--border)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "20px 0",
      gap: "20px",
    },
    button: {
      width: "40px",
      height: "40px",
      borderRadius: "10px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      color: "var(--muted-foreground)",
      transition: "all 0.2s ease",
      border: "none",
      background: "transparent",
    },
    activeButton: {
      backgroundColor: "var(--primary)",
      color: "var(--primary-foreground)",
    },
    userAvatar: {
      width: "36px",
      height: "36px",
      borderRadius: "50%",
      backgroundColor: "var(--primary-light)",
      color: "var(--primary)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "14px",
      fontWeight: "bold",
      marginBottom: "8px",
      cursor: "default",
    }
  };

  return (
    <div style={styles.container}>
      {/* Navigation */}
      <button
        style={{
          ...styles.button,
          ...(currentView === "chat" ? styles.activeButton : {}),
        }}
        onClick={() => onViewChange("chat")}
        title="Chat"
      >
        <MessageSquare size={24} />
      </button>

      <button
        style={{
          ...styles.button,
          ...(currentView === "graph" ? styles.activeButton : {}),
        }}
        onClick={() => onViewChange("graph")}
        title="Emotion Graph"
      >
        <BarChart2 size={24} />
      </button>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* User Section */}
      {user && (
        <div style={styles.userAvatar} title={user.username || user.email}>
          {user.username ? user.username[0].toUpperCase() : <User size={20} />}
        </div>
      )}

      {/* Settings (Placeholder) */}
      <button style={styles.button} title="Settings">
        <Settings size={24} />
      </button>

      {/* Logout */}
      {onLogout && (
        <button
          style={{ ...styles.button, color: "var(--destructive)" }}
          onClick={onLogout}
          title="Logout"
        >
          <LogOut size={24} />
        </button>
      )}
    </div>
  );
}
