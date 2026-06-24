import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase/config";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import BottomNav from "../components/BottomNav";

export default function MyPage() {
  const { user, userProfile, setUserProfile } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("history"); // "history" | "edit"
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const [name, setName] = useState(userProfile?.name ?? "");
  const [job, setJob] = useState(userProfile?.job ?? "");
  const [area, setArea] = useState(userProfile?.area ?? "");
  const [message, setMessage] = useState(userProfile?.message ?? "");
  const [menus, setMenus] = useState(userProfile?.menus ?? []);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const [sentSnap, recvSnap] = await Promise.all([
          getDocs(query(collection(db, "transactions"), where("fromUserId", "==", user.uid))),
          getDocs(query(collection(db, "transactions"), where("toUserId", "==", user.uid))),
        ]);
        const all = [
          ...sentSnap.docs.map((d) => ({ id: d.id, ...d.data(), direction: "sent" })),
          ...recvSnap.docs.map((d) => ({ id: d.id, ...d.data(), direction: "recv" })),
        ];
        const unique = Array.from(new Map(all.map((t) => [t.id, t])).values());
        unique.sort((a, b) => {
          const at = a.createdAt?.toDate?.() ?? new Date(0);
          const bt = b.createdAt?.toDate?.() ?? new Date(0);
          return bt - at;
        });
        setHistory(unique);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchHistory();
  }, [user.uid]);

  const formatDate = (ts) => {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg("");
    try {
      const updated = {
        name,
        job,
        area,
        message,
        menus: menus.filter((m) => m.name && m.price > 0),
      };
      await updateDoc(doc(db, "users", user.uid), updated);
      setUserProfile({ ...userProfile, ...updated });
      setSaveMsg("保存しました！");
    } catch (e) {
      setSaveMsg("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const addMenu = () => setMenus([...menus, { name: "", price: 0 }]);
  const updateMenu = (i, f, v) => {
    const u = [...menus];
    u[i] = { ...u[i], [f]: f === "price" ? Number(v) : v };
    setMenus(u);
  };
  const removeMenu = (i) => setMenus(menus.filter((_, idx) => idx !== i));

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.avatar}>{userProfile?.name?.[0] ?? "?"}</div>
        <div style={styles.headerInfo}>
          <p style={styles.headerName}>{userProfile?.name}</p>
          <p style={styles.headerSub}>{userProfile?.job}{userProfile?.area ? ` ・ ${userProfile?.area}` : ""}</p>
        </div>
        <div style={styles.opBadge}>
          <p style={styles.opBadgeNum}>{(userProfile?.op ?? 0).toLocaleString()}</p>
          <p style={styles.opBadgeLabel}>OP</p>
        </div>
      </div>

      <div style={styles.tabs}>
        <button
          onClick={() => setTab("history")}
          style={{ ...styles.tabBtn, ...(tab === "history" ? styles.tabActive : {}) }}
        >
          取引履歴
        </button>
        <button
          onClick={() => setTab("edit")}
          style={{ ...styles.tabBtn, ...(tab === "edit" ? styles.tabActive : {}) }}
        >
          プロフィール編集
        </button>
      </div>

      <div style={styles.body}>
        {tab === "history" && (
          <div>
            {loadingHistory ? (
              <div style={styles.loading}>読み込み中...</div>
            ) : history.length === 0 ? (
              <div style={styles.empty}>
                <div style={styles.emptyIcon}>📋</div>
                <p>取引履歴がありません</p>
              </div>
            ) : (
              <div style={styles.historyList}>
                {history.map((tx) => (
                  <div key={tx.id} style={styles.historyCard}>
                    <div style={styles.historyTop}>
                      <span style={styles.historyMenu}>{tx.menuName}</span>
                      <span style={styles.historyDate}>{formatDate(tx.createdAt)}</span>
                    </div>
                    <div style={styles.historyBottom}>
                      <span style={{ ...styles.historyLabel, color: tx.direction === "sent" ? "#e65100" : "#2E7D32" }}>
                        {tx.direction === "sent" ? "支払い" : "受取"}
                      </span>
                      <span style={styles.historyPaid}>¥{tx.paid?.toLocaleString()}</span>
                      <span style={styles.historyOP}>+{tx.op?.toLocaleString()} OP</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "edit" && (
          <div style={styles.editSection}>
            <label style={styles.label}>お名前</label>
            <input value={name} onChange={(e) => setName(e.target.value)} style={styles.input} />

            <label style={styles.label}>職業・活動</label>
            <input value={job} onChange={(e) => setJob(e.target.value)} style={styles.input} />

            <label style={styles.label}>地域</label>
            <input value={area} onChange={(e) => setArea(e.target.value)} style={styles.input} />

            <label style={styles.label}>ひとこと</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              style={{ ...styles.input, height: 72, resize: "none" }}
            />

            <label style={styles.label}>定価メニュー</label>
            {menus.map((m, i) => (
              <div key={i} style={styles.menuRow}>
                <input
                  value={m.name}
                  onChange={(e) => updateMenu(i, "name", e.target.value)}
                  placeholder="名前"
                  style={{ ...styles.input, flex: 2, marginBottom: 0 }}
                />
                <input
                  type="number"
                  value={m.price || ""}
                  onChange={(e) => updateMenu(i, "price", e.target.value)}
                  placeholder="価格"
                  style={{ ...styles.input, flex: 1, marginBottom: 0, textAlign: "right" }}
                />
                <button onClick={() => removeMenu(i)} style={styles.removeBtn}>✕</button>
              </div>
            ))}
            <button onClick={addMenu} style={styles.addMenuBtn}>＋ メニュー追加</button>

            {saveMsg && (
              <p style={{ ...styles.saveMsg, color: saveMsg.includes("失敗") ? "#c62828" : "var(--green-primary)" }}>
                {saveMsg}
              </p>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ ...styles.saveBtn, ...(saving ? styles.btnDisabled : {}) }}
            >
              {saving ? "保存中..." : "保存する"}
            </button>

            {userProfile?.isAdmin && (
              <button
                onClick={() => navigate("/admin")}
                style={styles.adminBtn}
              >
                管理画面へ
              </button>
            )}

            <button
              onClick={() => signOut(auth)}
              style={styles.logoutBtn}
            >
              ログアウト
            </button>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "var(--bg)",
    paddingBottom: 80,
  },
  header: {
    background: "var(--green-primary)",
    padding: "20px 20px 24px",
    display: "flex",
    alignItems: "center",
    gap: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.25)",
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    border: "2px solid rgba(255,255,255,0.5)",
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 2,
  },
  headerSub: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
  },
  opBadge: {
    background: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    padding: "8px 14px",
    textAlign: "center",
    border: "1px solid rgba(255,255,255,0.3)",
  },
  opBadgeNum: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
    lineHeight: 1,
  },
  opBadgeLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 11,
    marginTop: 2,
  },
  tabs: {
    display: "flex",
    borderBottom: "2px solid #e0e0e0",
    background: "#fff",
  },
  tabBtn: {
    flex: 1,
    padding: "14px",
    fontSize: 14,
    fontWeight: "bold",
    color: "var(--text-sub)",
    background: "transparent",
    borderBottom: "3px solid transparent",
  },
  tabActive: {
    color: "var(--green-primary)",
    borderBottomColor: "var(--green-primary)",
  },
  body: {
    padding: "16px",
  },
  loading: {
    textAlign: "center",
    color: "var(--text-sub)",
    padding: 40,
  },
  empty: {
    textAlign: "center",
    padding: 48,
    color: "var(--text-sub)",
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  historyList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  historyCard: {
    background: "#fff",
    borderRadius: 12,
    padding: "14px 16px",
    boxShadow: "var(--shadow)",
  },
  historyTop: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  historyMenu: {
    fontSize: 15,
    fontWeight: "bold",
  },
  historyDate: {
    fontSize: 12,
    color: "var(--text-sub)",
  },
  historyBottom: {
    display: "flex",
    justifyContent: "space-between",
  },
  historyPaid: {
    fontSize: 14,
    color: "var(--text-sub)",
  },
  historyOP: {
    fontSize: 14,
    fontWeight: "bold",
    color: "var(--green-light)",
  },
  editSection: {
    background: "#fff",
    borderRadius: 16,
    padding: "20px 16px",
    boxShadow: "var(--shadow)",
  },
  label: {
    display: "block",
    fontSize: 13,
    fontWeight: "bold",
    color: "#424242",
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    border: "2px solid #e0e0e0",
    borderRadius: 10,
    fontSize: 15,
    marginBottom: 4,
    background: "#fafafa",
  },
  menuRow: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    marginBottom: 8,
  },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    background: "#ffebee",
    color: "#c62828",
    fontSize: 14,
    flexShrink: 0,
  },
  addMenuBtn: {
    width: "100%",
    padding: "11px",
    border: "2px dashed #a5d6a7",
    borderRadius: 10,
    background: "transparent",
    color: "var(--green-primary)",
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 4,
    marginBottom: 16,
  },
  saveMsg: {
    textAlign: "center",
    fontSize: 14,
    marginBottom: 8,
    fontWeight: "bold",
  },
  saveBtn: {
    width: "100%",
    padding: "15px",
    background: "var(--green-primary)",
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    borderRadius: 12,
    marginBottom: 12,
  },
  btnDisabled: {
    background: "#a5d6a7",
    cursor: "not-allowed",
  },
  adminBtn: {
    width: "100%",
    padding: "14px",
    background: "#E8F5E9",
    color: "#2E7D32",
    fontSize: 15,
    fontWeight: "bold",
    borderRadius: 12,
    marginBottom: 12,
  },
  logoutBtn: {
    width: "100%",
    padding: "14px",
    background: "#ffebee",
    color: "#c62828",
    fontSize: 15,
    fontWeight: "bold",
    borderRadius: 12,
  },
  historyLabel: {
    fontSize: 12,
    fontWeight: "bold",
  },
};
