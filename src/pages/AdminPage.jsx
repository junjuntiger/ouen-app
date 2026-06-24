import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export default function AdminPage() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("stats");
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingOpId, setEditingOpId] = useState(null);
  const [editingOpValue, setEditingOpValue] = useState("");

  useEffect(() => {
    if (!userProfile?.isAdmin) {
      navigate("/");
      return;
    }
    fetchAll();
  }, [userProfile]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [usersSnap, txSnap] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(query(collection(db, "transactions"), orderBy("createdAt", "desc"))),
      ]);
      const usersData = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setUsers(usersData);

      const txData = txSnap.docs.map((d) => {
        const tx = { id: d.id, ...d.data() };
        const from = usersData.find((u) => u.id === tx.fromUserId);
        const to = usersData.find((u) => u.id === tx.toUserId);
        return { ...tx, fromName: from?.name ?? "不明", toName: to?.name ?? "不明" };
      });
      setTransactions(txData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const startEditOp = (u) => {
    setEditingOpId(u.id);
    setEditingOpValue(String(u.op || 0));
  };

  const saveOp = async (userId) => {
    const newOp = Number(editingOpValue);
    if (isNaN(newOp)) return;
    await updateDoc(doc(db, "users", userId), { op: newOp });
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, op: newOp } : u));
    setEditingOpId(null);
  };

  const formatDate = (ts) => {
    if (!ts) return "-";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
  };

  const totalPaid = transactions.reduce((s, t) => s + (t.paid || 0), 0);
  const totalOP = transactions.reduce((s, t) => s + (t.op || 0), 0);

  if (!userProfile?.isAdmin) return null;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={() => navigate("/")} style={styles.backBtn}>🏠</button>
        <h1 style={styles.title}>管理画面</h1>
      </div>

      <div style={styles.tabs}>
        {["stats", "users", "transactions"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{ ...styles.tab, ...(tab === t ? styles.tabActive : {}) }}
          >
            {t === "stats" ? "統計" : t === "users" ? "ユーザー" : "取引履歴"}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={styles.loading}>読み込み中...</div>
      ) : (
        <div style={styles.content}>
          {tab === "stats" && (
            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <p style={styles.statLabel}>総ユーザー数</p>
                <p style={styles.statValue}>{users.length}<span style={styles.statUnit}>人</span></p>
              </div>
              <div style={styles.statCard}>
                <p style={styles.statLabel}>総取引件数</p>
                <p style={styles.statValue}>{transactions.length}<span style={styles.statUnit}>件</span></p>
              </div>
              <div style={styles.statCard}>
                <p style={styles.statLabel}>総売上</p>
                <p style={styles.statValue}>¥{totalPaid.toLocaleString()}</p>
              </div>
              <div style={styles.statCard}>
                <p style={styles.statLabel}>総発行OP</p>
                <p style={styles.statValue}>{totalOP.toLocaleString()}<span style={styles.statUnit}> OP</span></p>
              </div>
            </div>
          )}

          {tab === "users" && (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>名前</th>
                    <th style={styles.th}>職業</th>
                    <th style={styles.th}>地域</th>
                    <th style={styles.th}>OP</th>
                    <th style={styles.th}>登録日</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} style={styles.tr}>
                      <td style={styles.td}>{u.name}</td>
                      <td style={styles.td}>{u.job || "-"}</td>
                      <td style={styles.td}>{u.area || "-"}</td>
                      <td style={{ ...styles.td, textAlign: "right" }}>
                        {editingOpId === u.id ? (
                          <div style={styles.opEditRow}>
                            <input
                              type="number"
                              value={editingOpValue}
                              onChange={(e) => setEditingOpValue(e.target.value)}
                              style={styles.opInput}
                              autoFocus
                            />
                            <button onClick={() => saveOp(u.id)} style={styles.opSaveBtn}>✓</button>
                            <button onClick={() => setEditingOpId(null)} style={styles.opCancelBtn}>✕</button>
                          </div>
                        ) : (
                          <span onClick={() => startEditOp(u)} style={styles.opClickable}>
                            {(u.op || 0).toLocaleString()} ✏️
                          </span>
                        )}
                      </td>
                      <td style={styles.td}>{formatDate(u.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === "transactions" && (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>送り手</th>
                    <th style={styles.th}>受け手</th>
                    <th style={styles.th}>メニュー</th>
                    <th style={styles.th}>金額</th>
                    <th style={styles.th}>OP</th>
                    <th style={styles.th}>日時</th>
                    <th style={styles.th}></th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} style={styles.tr}>
                      <td style={styles.td}>{tx.fromName}</td>
                      <td style={styles.td}>{tx.toName}</td>
                      <td style={styles.td}>{tx.menuName}</td>
                      <td style={{ ...styles.td, textAlign: "right" }}>¥{(tx.paid || 0).toLocaleString()}</td>
                      <td style={{ ...styles.td, textAlign: "right" }}>{(tx.op || 0).toLocaleString()}</td>
                      <td style={styles.td}>{formatDate(tx.createdAt)}</td>
                      <td style={styles.td}>
                        <button
                          onClick={async () => {
                            if (!window.confirm("この取引を削除しますか？")) return;
                            await deleteDoc(doc(db, "transactions", tx.id));
                            setTransactions((prev) => prev.filter((t) => t.id !== tx.id));
                          }}
                          style={styles.deleteBtn}
                        >
                          削除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "#f5f5f5",
  },
  header: {
    background: "#1B5E20",
    padding: "16px 20px",
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  backBtn: {
    background: "transparent",
    fontSize: 28,
    padding: "4px",
    lineHeight: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  tabs: {
    display: "flex",
    background: "#fff",
    borderBottom: "1px solid #e0e0e0",
  },
  tab: {
    flex: 1,
    padding: "14px",
    fontSize: 14,
    color: "#757575",
    background: "transparent",
    borderBottom: "2px solid transparent",
  },
  tabActive: {
    color: "#2E7D32",
    fontWeight: "bold",
    borderBottom: "2px solid #2E7D32",
  },
  loading: {
    textAlign: "center",
    padding: 60,
    color: "#757575",
  },
  content: {
    padding: 16,
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },
  statCard: {
    background: "#fff",
    borderRadius: 12,
    padding: "20px 16px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    textAlign: "center",
  },
  statLabel: {
    fontSize: 12,
    color: "#757575",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#212121",
  },
  statUnit: {
    fontSize: 14,
    fontWeight: "normal",
    color: "#757575",
  },
  tableWrap: {
    background: "#fff",
    borderRadius: 12,
    overflow: "auto",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 13,
    minWidth: 500,
  },
  th: {
    padding: "12px 14px",
    textAlign: "left",
    background: "#f5f5f5",
    color: "#424242",
    fontWeight: "bold",
    borderBottom: "1px solid #e0e0e0",
    whiteSpace: "nowrap",
  },
  tr: {
    borderBottom: "1px solid #f0f0f0",
  },
  td: {
    padding: "12px 14px",
    color: "#424242",
    whiteSpace: "nowrap",
  },
  opClickable: {
    cursor: "pointer",
    padding: "4px 8px",
    borderRadius: 6,
    display: "inline-block",
  },
  opEditRow: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    justifyContent: "flex-end",
  },
  opInput: {
    width: 90,
    padding: "4px 8px",
    border: "2px solid #2E7D32",
    borderRadius: 6,
    fontSize: 13,
    textAlign: "right",
  },
  opSaveBtn: {
    padding: "4px 8px",
    background: "#2E7D32",
    color: "#fff",
    borderRadius: 6,
    fontSize: 13,
    fontWeight: "bold",
  },
  opCancelBtn: {
    padding: "4px 8px",
    background: "#e0e0e0",
    color: "#424242",
    borderRadius: 6,
    fontSize: 13,
  },
  deleteBtn: {
    padding: "4px 10px",
    background: "#ffebee",
    color: "#c62828",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: "bold",
  },
};
