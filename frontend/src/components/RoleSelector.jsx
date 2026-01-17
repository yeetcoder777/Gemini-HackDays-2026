import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { LightbulbIcon, UsersIcon, ZapIcon } from "./Icons";

const ROLES = [
  {
    id: "teacher",
    label: "Teacher",
    description: "Educational and explanatory",
    icon: <LightbulbIcon size={20} />,
  },
  {
    id: "companion",
    label: "Companion",
    description: "Friendly and conversational",
    icon: <UsersIcon size={20} />,
  },
  {
    id: "assistant",
    label: "Assistant",
    description: "Professional and efficient",
    icon: <ZapIcon size={20} />,
  },
];

const styles = {
  container: {
    width: "256px",
    backgroundColor: "var(--sidebar)",
    borderRight: "1px solid var(--sidebar-border)",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    flexShrink: 0,
  },
  mobileCard: {
    padding: "16px",
    textAlign: "center",
  },
  emoji: {
    fontSize: "32px",
    marginBottom: "8px",
  },
  mobileText: {
    fontSize: "12px",
    color: "var(--muted-foreground)",
  },
  sectionTitle: {
    fontSize: "12px",
    fontWeight: 600,
    color: "var(--sidebar-foreground)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: "4px",
  },
  roleButton: {
    width: "100%",
    justifyContent: "flex-start",
    gap: "12px",
    height: "auto",
    padding: "12px",
    textAlign: "left",
  },
  roleButtonActive: {
    backgroundColor: "var(--sidebar-primary)",
    color: "var(--sidebar-primary-foreground)",
  },
  roleButtonInactive: {
    backgroundColor: "transparent",
    border: "1px solid var(--sidebar-border)",
    color: "var(--sidebar-foreground)",
  },
  iconWrapper: {
    fontSize: "18px",
  },
  roleTextContainer: {
    textAlign: "left",
  },
  roleLabel: {
    fontSize: "14px",
    fontWeight: 500,
  },
  roleDescription: {
    fontSize: "12px",
    opacity: 0.7,
  },
  infoSection: {
    marginTop: "auto",
    paddingTop: "16px",
    borderTop: "1px solid var(--sidebar-border)",
  },
  infoTitle: {
    fontSize: "12px",
    fontWeight: 500,
    color: "var(--sidebar-foreground)",
    marginBottom: "8px",
  },
  infoText: {
    fontSize: "12px",
    color: "var(--sidebar-foreground)",
    opacity: 0.75,
    lineHeight: 1.5,
  },
};

export default function RoleSelector({ role, onRoleChange }) {
  return (
    <div style={styles.container}>
      {/* Role Selection */}
      <div>
        <p style={styles.sectionTitle}>Select Mode</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {ROLES.map((roleOption) => (
            <Button
              key={roleOption.id}
              onClick={() => onRoleChange(roleOption.id)}
              variant={role === roleOption.id ? "default" : "outline"}
              style={{
                ...styles.roleButton,
                ...(role === roleOption.id
                  ? styles.roleButtonActive
                  : styles.roleButtonInactive),
              }}
            >
              <span style={styles.iconWrapper}>{roleOption.icon}</span>
              <div style={styles.roleTextContainer}>
                <p style={styles.roleLabel}>{roleOption.label}</p>
                <p style={styles.roleDescription}>{roleOption.description}</p>
              </div>
            </Button>
          ))}
        </div>
      </div>

      {/* Info Section */}
      <div style={styles.infoSection}>
        <p style={styles.infoTitle}>Current Mode</p>
        <p style={styles.infoText}>
          Your messages will be answered in the {role} style. Switch modes anytime!
        </p>
      </div>
    </div>
  );
}
