import { useNavigate, useLocation } from "react-router-dom";

const tabs = [
  { path: "/", label: "ホーム", icon: "🏠" },
  { path: "/ouen", label: "おーえん", icon: "🤝" },
  { path: "/members", label: "メンバー", icon: "👥" },
  { path: "/mypage", label: "マイページ", icon: "👤" },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav style={styles.nav}>
      {tabs.map((tab) => {
        const active = location.pathname === tab.path;
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            style={{ ...styles.tab, ...(active ? styles.activeTab : {}) }}
          >
            <span style={styles.icon}>{tab.icon}</span>
            <span style={{ ...styles.label, ...(active ? styles.activeLabel : {}) }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

const styles = {
  nav: {
    position: "fixed",
    bottom: 0,
    left: "50%",
    transform: "translateX(-50%)",
    width: "100%",
    maxWidth: 480,
    background: "#fff",
    borderTop: "1px solid #e0e0e0",
    display: "flex",
    zIndex: 100,
    paddingBottom: "env(safe-area-inset-bottom)",
  },
  tab: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "8px 0",
    background: "transparent",
    gap: 2,
  },
  activeTab: {
    background: "var(--green-pale)",
  },
  icon: {
    fontSize: 22,
  },
  label: {
    fontSize: 10,
    color: "var(--text-sub)",
  },
  activeLabel: {
    color: "var(--green-primary)",
    fontWeight: "bold",
  },
};
