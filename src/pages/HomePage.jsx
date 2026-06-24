import { useEffect, useState } from "react";
import { collection, query, orderBy, limit, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../contexts/AuthContext";
import BottomNav from "../components/BottomNav";

export default function HomePage() {
  const { user, userProfile } = useAuth();
  const [timeline, setTimeline] = useState([]);
  const [loadingTimeline, setLoadingTimeline] = useState(true);

  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        const q = query(
          collection(db, "transactions"),
          orderBy("createdAt", "desc"),
          limit(20)
        );
        const snap = await getDocs(q);
        const items = await Promise.all(
          snap.docs.map(async (d) => {
            const tx = { id: d.id, ...d.data() };
            const [fromSnap, toSnap] = await Promise.all([
              getDoc(doc(db, "users", tx.fromUserId)),
              getDoc(doc(db, "users", tx.toUserId)),
            ]);
            return {
              ...tx,
              fromName: fromSnap.exists() ? fromSnap.data().name : "不明",
              toName: toSnap.exists() ? toSnap.data().name : "不明",
            };
          })
        );
        setTimeline(items);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingTimeline(false);
      }
    };
    fetchTimeline();
  }, []);

  const formatOP = (op) => op?.toLocaleString() ?? "0";
  const formatDate = (ts) => {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerTop}>
          <div style={styles.logo}>応援</div>
          <span style={styles.appName}>おーえん</span>
        </div>
        <div style={styles.opCard}>
          <p style={styles.opLabel}>あなたのOPポイント</p>
          <div style={styles.opAmount}>
            <span style={styles.opNumber}>{formatOP(userProfile?.op)}</span>
            <span style={styles.opUnit}> OP</span>
          </div>
          <p style={styles.opSub}>おーえんした想いの記録</p>
        </div>
      </div>

      <div style={styles.body}>
        <h3 style={styles.timelineTitle}>最近のおーえん</h3>

        {loadingTimeline ? (
          <div style={styles.loading}>読み込み中...</div>
        ) : timeline.length === 0 ? (
          <div style={styles.empty}>
            <div style={styles.emptyIcon}>🌸</div>
            <p style={styles.emptyText}>まだおーえんはありません</p>
            <p style={styles.emptyDesc}>最初のおーえんをしてみましょう</p>
          </div>
        ) : (
          <div style={styles.timeline}>
            {timeline.map((tx) => (
              <div key={tx.id} style={styles.txCard}>
                <div style={styles.txHeader}>
                  <div style={styles.txNames}>
                    <span style={styles.txFrom}>{tx.fromName}</span>
                    <span style={styles.txArrow}> → </span>
                    <span style={styles.txTo}>{tx.toName}</span>
                  </div>
                  <span style={styles.txDate}>{formatDate(tx.createdAt)}</span>
                </div>
                <div style={styles.txBody}>
                  <span style={styles.txMenu}>{tx.menuName}</span>
                  <div style={styles.txRight}>
                    <span style={styles.txPaid}>¥{tx.paid?.toLocaleString()}</span>
                    <span style={styles.txOP}>+{tx.op?.toLocaleString()} OP</span>
                  </div>
                </div>
              </div>
            ))}
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
    background: "linear-gradient(135deg, #1B5E20 0%, #2E7D32 100%)",
    padding: "20px 20px 28px",
  },
  headerTop: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },
  logo: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
  },
  appName: {
    fontSize: 16,
    color: "rgba(255,255,255,0.85)",
    letterSpacing: 2,
  },
  opCard: {
    background: "rgba(255,255,255,0.12)",
    borderRadius: 16,
    padding: "20px 24px",
    textAlign: "center",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(255,255,255,0.2)",
  },
  opLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    marginBottom: 8,
  },
  opAmount: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "center",
    gap: 4,
  },
  opNumber: {
    fontSize: 52,
    fontWeight: "bold",
    color: "#fff",
    lineHeight: 1,
  },
  opUnit: {
    fontSize: 20,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "bold",
  },
  opSub: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 12,
    marginTop: 8,
  },
  body: {
    padding: "20px 16px",
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "var(--text-main)",
    marginBottom: 14,
    paddingLeft: 4,
  },
  loading: {
    textAlign: "center",
    color: "var(--text-sub)",
    padding: 40,
  },
  empty: {
    textAlign: "center",
    padding: "48px 20px",
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "var(--text-sub)",
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    color: "#bdbdbd",
  },
  timeline: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  txCard: {
    background: "#fff",
    borderRadius: 12,
    padding: "14px 16px",
    boxShadow: "var(--shadow)",
  },
  txHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  txNames: {
    fontSize: 14,
    fontWeight: "bold",
  },
  txFrom: {
    color: "var(--green-primary)",
  },
  txArrow: {
    color: "#bdbdbd",
  },
  txTo: {
    color: "#e65100",
  },
  txDate: {
    fontSize: 11,
    color: "var(--text-sub)",
  },
  txBody: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  txMenu: {
    fontSize: 13,
    color: "var(--text-sub)",
  },
  txRight: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
  },
  txPaid: {
    fontSize: 14,
    fontWeight: "bold",
    color: "var(--text-main)",
  },
  txOP: {
    fontSize: 13,
    color: "var(--green-light)",
    fontWeight: "bold",
  },
};
