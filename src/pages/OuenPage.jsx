import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  increment,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../contexts/AuthContext";
import BottomNav from "../components/BottomNav";

const STEPS = ["メンバー選択", "メニュー選択", "金額入力", "確認"];

export default function OuenPage() {
  const { user, userProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedMenu, setSelectedMenu] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [paid, setPaid] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchMembers = async () => {
      const snap = await getDocs(collection(db, "users"));
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((m) => m.id !== user.uid);
      setMembers(list);
    };
    fetchMembers();
  }, [user.uid]);

  const filteredMembers = members.filter(
    (m) =>
      m.name?.includes(search) ||
      m.job?.includes(search) ||
      m.area?.includes(search)
  );

  const totalPrice = selectedMenu ? selectedMenu.price * quantity : 0;
  const paidNum = Number(paid);
  const op = paidNum > totalPrice ? paidNum - totalPrice : 0;

  const handleSubmit = async () => {
    setError("");
    if (paidNum < totalPrice) {
      setError("支払い金額は定価以上を入力してください");
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, "transactions"), {
        fromUserId: user.uid,
        toUserId: selectedMember.id,
        menuName: selectedMenu.name,
        price: totalPrice,
        paid: paidNum,
        op,
        createdAt: serverTimestamp(),
      });

      if (op > 0) {
        await updateDoc(doc(db, "users", user.uid), { op: increment(op) });
      }

      setDone(true);
    } catch (e) {
      setError("送信に失敗しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep(0);
    setSelectedMember(null);
    setSelectedMenu(null);
    setQuantity(1);
    setPaid("");
    setDone(false);
    setError("");
    setSearch("");
  };

  if (done) {
    return (
      <div style={styles.container}>
        <div style={styles.doneScreen}>
          <div style={styles.doneIcon}>🎉</div>
          <h2 style={styles.doneTitle}>おーえん完了！</h2>
          <p style={styles.doneDesc}>{selectedMember?.name}さんへのおーえんが記録されました</p>
          <div style={styles.opResult}>
            <span style={styles.opResultLabel}>獲得OP</span>
            <span style={styles.opResultValue}>+{op.toLocaleString()} OP</span>
          </div>
          <button onClick={reset} style={styles.doneBtn}>
            続けておーえんする
          </button>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.topBar}>
        <h1 style={styles.title}>おーえんする</h1>
        <div style={styles.steps}>
          {STEPS.map((s, i) => (
            <div key={i} style={{ ...styles.stepDot, ...(i <= step ? styles.stepActive : {}) }}>
              {i < step ? "✓" : i + 1}
            </div>
          ))}
        </div>
        <p style={styles.stepLabel}>{STEPS[step]}</p>
      </div>

      <div style={styles.body}>
        {step === 0 && (
          <div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="名前・職業・地域で検索"
              style={styles.searchInput}
            />
            <div style={styles.memberList}>
              {filteredMembers.length === 0 ? (
                <div style={styles.empty}>メンバーが見つかりません</div>
              ) : (
                filteredMembers.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => { setSelectedMember(m); setStep(1); }}
                    style={styles.memberCard}
                  >
                    <div style={styles.memberAvatar}>{m.name?.[0] ?? "?"}</div>
                    <div style={styles.memberInfo}>
                      <span style={styles.memberName}>{m.name}</span>
                      <span style={styles.memberSub}>{m.job}{m.area ? ` ・ ${m.area}` : ""}</span>
                    </div>
                    <span style={styles.memberOP}>{(m.op ?? 0).toLocaleString()} OP</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {step === 1 && selectedMember && (
          <div>
            <div style={styles.selectedInfo}>
              <div style={styles.memberAvatar}>{selectedMember.name?.[0]}</div>
              <div>
                <p style={styles.memberName}>{selectedMember.name}</p>
                <p style={styles.memberSub}>{selectedMember.job}</p>
              </div>
            </div>
            <h3 style={styles.sectionTitle}>定価メニューを選ぶ</h3>
            {(!selectedMember.menus || selectedMember.menus.length === 0) ? (
              <div style={styles.empty}>メニューが登録されていません</div>
            ) : (
              selectedMember.menus.map((menu, i) => (
                <button
                  key={i}
                  onClick={() => { setSelectedMenu(menu); setStep(2); }}
                  style={styles.menuCard}
                >
                  <span style={styles.menuName}>{menu.name}</span>
                  <span style={styles.menuPrice}>¥{menu.price.toLocaleString()}</span>
                </button>
              ))
            )}
            <button onClick={() => setStep(0)} style={styles.backBtn}>← 戻る</button>
          </div>
        )}

        {step === 2 && selectedMenu && (
          <div>
            <div style={styles.menuSummary}>
              <p style={styles.menuSummaryLabel}>選択中のメニュー</p>
              <p style={styles.menuSummaryName}>{selectedMenu.name}</p>
              <p style={styles.menuSummaryPrice}>定価 ¥{selectedMenu.price.toLocaleString()} / 個</p>
            </div>

            <div style={styles.formSection}>
              <label style={styles.label}>数量</label>
              <div style={styles.quantityRow}>
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} style={styles.qBtn}>−</button>
                <span style={styles.qValue}>{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)} style={styles.qBtn}>＋</button>
              </div>
              <p style={styles.totalLabel}>合計定価：<strong>¥{totalPrice.toLocaleString()}</strong></p>

              <label style={styles.label}>支払い金額</label>
              <div style={styles.paidRow}>
                <span style={styles.yen}>¥</span>
                <input
                  type="number"
                  value={paid}
                  onChange={(e) => setPaid(e.target.value)}
                  placeholder={totalPrice}
                  style={styles.paidInput}
                  min={totalPrice}
                />
              </div>

              {paid && (
                <div style={{ ...styles.opPreview, ...(op > 0 ? styles.opPositive : styles.opZero) }}>
                  {op > 0 ? (
                    <>
                      <span style={styles.opPreviewLabel}>獲得OP</span>
                      <span style={styles.opPreviewValue}>+{op.toLocaleString()} OP</span>
                    </>
                  ) : (
                    <span style={styles.opPreviewLabel}>
                      {paidNum < totalPrice ? "定価以上を入力してください" : "定価と同額（OP=0）"}
                    </span>
                  )}
                </div>
              )}
            </div>

            {error && <p style={styles.error}>{error}</p>}
            <button
              onClick={() => { if (!error) setStep(3); }}
              disabled={!paid || paidNum < totalPrice}
              style={{ ...styles.nextBtn, ...(!paid || paidNum < totalPrice ? styles.btnDisabled : {}) }}
            >
              確認へ進む
            </button>
            <button onClick={() => setStep(1)} style={styles.backBtn}>← 戻る</button>
          </div>
        )}

        {step === 3 && (
          <div>
            <h3 style={styles.sectionTitle}>内容を確認</h3>
            <div style={styles.confirmCard}>
              <Row label="おーえん先" value={selectedMember?.name} />
              <Row label="商品" value={selectedMenu?.name} />
              <Row label="数量" value={`${quantity}個`} />
              <Row label="定価合計" value={`¥${totalPrice.toLocaleString()}`} />
              <Row label="支払い金額" value={<strong style={{ fontSize: 20 }}>¥{paidNum.toLocaleString()}</strong>} />
              <div style={styles.divider} />
              <Row
                label="獲得OP"
                value={<span style={{ color: "var(--green-primary)", fontWeight: "bold", fontSize: 20 }}>+{op.toLocaleString()} OP</span>}
              />
            </div>

            {error && <p style={styles.error}>{error}</p>}
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{ ...styles.nextBtn, ...(loading ? styles.btnDisabled : {}) }}
            >
              {loading ? "処理中..." : "おーえんする！"}
            </button>
            <button onClick={() => setStep(2)} style={styles.backBtn}>← 戻る</button>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f0f0f0" }}>
      <span style={{ color: "#757575", fontSize: 14 }}>{label}</span>
      <span style={{ fontSize: 15 }}>{value}</span>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "var(--bg)",
    paddingBottom: 80,
  },
  topBar: {
    background: "var(--green-primary)",
    padding: "20px 20px 16px",
    textAlign: "center",
  },
  title: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
  },
  steps: {
    display: "flex",
    justifyContent: "center",
    gap: 8,
    marginBottom: 8,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.3)",
    color: "rgba(255,255,255,0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: "bold",
  },
  stepActive: {
    background: "#fff",
    color: "var(--green-primary)",
  },
  stepLabel: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
  },
  body: {
    padding: "16px",
  },
  searchInput: {
    width: "100%",
    padding: "13px 16px",
    border: "2px solid #e0e0e0",
    borderRadius: 12,
    fontSize: 15,
    background: "#fff",
    marginBottom: 12,
  },
  memberList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  memberCard: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "#fff",
    borderRadius: 12,
    padding: "14px 16px",
    boxShadow: "var(--shadow)",
    width: "100%",
    textAlign: "left",
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: "50%",
    background: "var(--green-pale)",
    color: "var(--green-primary)",
    fontSize: 20,
    fontWeight: "bold",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  memberInfo: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  memberName: {
    fontSize: 15,
    fontWeight: "bold",
    color: "var(--text-main)",
  },
  memberSub: {
    fontSize: 12,
    color: "var(--text-sub)",
  },
  memberOP: {
    fontSize: 12,
    color: "var(--green-light)",
    fontWeight: "bold",
  },
  selectedInfo: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "#fff",
    borderRadius: 12,
    padding: "14px 16px",
    marginBottom: 16,
    boxShadow: "var(--shadow)",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "var(--text-main)",
    marginBottom: 12,
  },
  menuCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#fff",
    borderRadius: 12,
    padding: "16px",
    boxShadow: "var(--shadow)",
    width: "100%",
    marginBottom: 8,
  },
  menuName: {
    fontSize: 15,
    fontWeight: "bold",
  },
  menuPrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: "var(--green-primary)",
  },
  menuSummary: {
    background: "#fff",
    borderRadius: 12,
    padding: "16px",
    marginBottom: 16,
    boxShadow: "var(--shadow)",
    textAlign: "center",
  },
  menuSummaryLabel: {
    fontSize: 12,
    color: "var(--text-sub)",
    marginBottom: 4,
  },
  menuSummaryName: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  menuSummaryPrice: {
    fontSize: 14,
    color: "var(--text-sub)",
  },
  formSection: {
    background: "#fff",
    borderRadius: 12,
    padding: "16px",
    marginBottom: 16,
    boxShadow: "var(--shadow)",
  },
  label: {
    display: "block",
    fontSize: 13,
    fontWeight: "bold",
    color: "#424242",
    marginBottom: 8,
    marginTop: 12,
  },
  quantityRow: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    marginBottom: 4,
  },
  qBtn: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: "var(--green-pale)",
    color: "var(--green-primary)",
    fontSize: 20,
    fontWeight: "bold",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  qValue: {
    fontSize: 24,
    fontWeight: "bold",
    minWidth: 32,
    textAlign: "center",
  },
  totalLabel: {
    fontSize: 14,
    color: "var(--text-sub)",
    marginBottom: 4,
  },
  paidRow: {
    display: "flex",
    alignItems: "center",
    border: "2px solid #e0e0e0",
    borderRadius: 10,
    overflow: "hidden",
  },
  yen: {
    padding: "12px 14px",
    background: "#f5f5f5",
    color: "#424242",
    fontSize: 16,
    fontWeight: "bold",
    borderRight: "1px solid #e0e0e0",
  },
  paidInput: {
    flex: 1,
    padding: "14px 12px",
    fontSize: 20,
    border: "none",
    background: "transparent",
    textAlign: "right",
  },
  opPreview: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 10,
    padding: "12px 16px",
    marginTop: 12,
  },
  opPositive: {
    background: "var(--green-pale)",
  },
  opZero: {
    background: "#fff3e0",
  },
  opPreviewLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#424242",
  },
  opPreviewValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "var(--green-primary)",
  },
  confirmCard: {
    background: "#fff",
    borderRadius: 12,
    padding: "8px 16px",
    boxShadow: "var(--shadow)",
    marginBottom: 20,
  },
  divider: {
    height: 1,
    background: "#e0e0e0",
    margin: "4px 0",
  },
  nextBtn: {
    width: "100%",
    padding: "16px",
    background: "var(--green-primary)",
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    borderRadius: 14,
    marginBottom: 10,
  },
  btnDisabled: {
    background: "#a5d6a7",
    cursor: "not-allowed",
  },
  backBtn: {
    width: "100%",
    padding: "12px",
    background: "transparent",
    color: "var(--text-sub)",
    fontSize: 14,
  },
  error: {
    color: "#c62828",
    fontSize: 13,
    marginBottom: 8,
    textAlign: "center",
  },
  empty: {
    textAlign: "center",
    color: "var(--text-sub)",
    padding: 32,
  },
  doneScreen: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "80vh",
    padding: 32,
    textAlign: "center",
  },
  doneIcon: {
    fontSize: 72,
    marginBottom: 16,
  },
  doneTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "var(--green-primary)",
    marginBottom: 8,
  },
  doneDesc: {
    fontSize: 15,
    color: "var(--text-sub)",
    marginBottom: 24,
  },
  opResult: {
    background: "var(--green-pale)",
    borderRadius: 16,
    padding: "20px 40px",
    marginBottom: 32,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
  },
  opResultLabel: {
    fontSize: 13,
    color: "var(--text-sub)",
  },
  opResultValue: {
    fontSize: 36,
    fontWeight: "bold",
    color: "var(--green-primary)",
  },
  doneBtn: {
    padding: "16px 40px",
    background: "var(--green-primary)",
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    borderRadius: 14,
  },
};
