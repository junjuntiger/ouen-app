import { useState, useRef, useEffect } from "react";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { auth } from "../firebase/config";

export default function LoginPage() {
  const [step, setStep] = useState("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const confirmationRef = useRef(null);
  const verifierRef = useRef(null);

  useEffect(() => {
    try {
      const verifier = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
        callback: () => {},
        "expired-callback": () => {
          setError("reCAPTCHAの有効期限が切れました。もう一度お試しください。");
        },
      });
      verifierRef.current = verifier;
    } catch (e) {
      console.error("RecaptchaVerifier初期化エラー:", e);
    }
    return () => {
      if (verifierRef.current) {
        try { verifierRef.current.clear(); } catch (_) {}
        verifierRef.current = null;
      }
    };
  }, []);

  const handleSendCode = async () => {
    setError("");
    const fullPhone = phone.startsWith("+") ? phone : "+81" + phone.replace(/^0/, "");
    if (fullPhone.replace(/\D/g, "").length < 10) {
      setError("正しい電話番号を入力してください");
      return;
    }
    setLoading(true);
    try {
      const confirmation = await signInWithPhoneNumber(auth, fullPhone, verifierRef.current);
      confirmationRef.current = confirmation;
      setStep("code");
    } catch (e) {
      console.error("SMS送信エラー:", e.code, e.message);
      if (e.code === "auth/invalid-phone-number") {
        setError("電話番号の形式が正しくありません");
      } else if (e.code === "auth/too-many-requests") {
        setError("送信回数が多すぎます。しばらく待ってから再試行してください");
      } else if (e.code === "auth/captcha-check-failed") {
        setError("reCAPTCHA認証に失敗しました。ページを再読み込みしてください");
      } else {
        setError(`送信に失敗しました（${e.code ?? "不明"}）`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    setError("");
    if (code.length !== 6) {
      setError("6桁のコードを入力してください");
      return;
    }
    setLoading(true);
    try {
      await confirmationRef.current.confirm(code);
    } catch (e) {
      setError("コードが正しくありません");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.logoWrapper}>
          <span style={styles.logoKanji}>応援</span>
          <span style={styles.logoKana}>おーえん</span>
        </div>
        <p style={styles.tagline}>日本の伝統文化を、みんなで守る</p>
      </div>

      <div style={styles.card}>
        {step === "phone" ? (
          <>
            <h2 style={styles.title}>電話番号でログイン</h2>
            <p style={styles.desc}>SMSで確認コードを送信します</p>
            <div style={styles.inputGroup}>
              <label style={styles.label}>電話番号</label>
              <div style={styles.phoneInput}>
                <span style={styles.countryCode}>🇯🇵 +81</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="09012345678"
                  style={styles.input}
                  maxLength={11}
                />
              </div>
            </div>
            {error && <p style={styles.error}>{error}</p>}
            <button
              onClick={handleSendCode}
              disabled={loading || !phone}
              style={{ ...styles.btn, ...(loading || !phone ? styles.btnDisabled : {}) }}
            >
              {loading ? "送信中..." : "確認コードを送る"}
            </button>
          </>
        ) : (
          <>
            <h2 style={styles.title}>確認コードを入力</h2>
            <p style={styles.desc}>SMSに届いた6桁のコードを入力してください</p>
            <div style={styles.inputGroup}>
              <label style={styles.label}>確認コード</label>
              <input
                type="number"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                style={{ ...styles.input, width: "100%", textAlign: "center", letterSpacing: 8, fontSize: 24 }}
                maxLength={6}
              />
            </div>
            {error && <p style={styles.error}>{error}</p>}
            <button
              onClick={handleVerifyCode}
              disabled={loading || code.length !== 6}
              style={{ ...styles.btn, ...(loading || code.length !== 6 ? styles.btnDisabled : {}) }}
            >
              {loading ? "確認中..." : "ログイン"}
            </button>
            <button
              onClick={() => { setStep("phone"); setCode(""); setError(""); }}
              style={styles.backBtn}
            >
              電話番号を変更する
            </button>
          </>
        )}
      </div>

      <div id="recaptcha-container" />

      <div style={styles.footer}>
        <p style={styles.footerText}>
          ログインすることで<br />
          <span style={styles.link}>利用規約</span>および<span style={styles.link}>プライバシーポリシー</span>に同意したものとみなします
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(160deg, #1B5E20 0%, #2E7D32 40%, #388E3C 100%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "40px 20px 32px",
  },
  header: {
    textAlign: "center",
    marginBottom: 40,
  },
  logoWrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
  },
  logoKanji: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#fff",
    lineHeight: 1,
    textShadow: "0 2px 8px rgba(0,0,0,0.2)",
  },
  logoKana: {
    fontSize: 20,
    color: "rgba(255,255,255,0.9)",
    letterSpacing: 4,
  },
  tagline: {
    marginTop: 12,
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
  },
  card: {
    background: "#fff",
    borderRadius: 20,
    padding: "32px 24px",
    width: "100%",
    maxWidth: 400,
    boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#212121",
    marginBottom: 8,
  },
  desc: {
    fontSize: 14,
    color: "#757575",
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    display: "block",
    fontSize: 13,
    fontWeight: "bold",
    color: "#424242",
    marginBottom: 8,
  },
  phoneInput: {
    display: "flex",
    alignItems: "center",
    border: "2px solid #e0e0e0",
    borderRadius: 10,
    overflow: "hidden",
  },
  countryCode: {
    padding: "12px 12px",
    background: "#f5f5f5",
    fontSize: 14,
    color: "#424242",
    borderRight: "1px solid #e0e0e0",
    whiteSpace: "nowrap",
  },
  input: {
    flex: 1,
    padding: "14px 12px",
    fontSize: 16,
    border: "none",
    background: "transparent",
  },
  btn: {
    width: "100%",
    padding: "15px",
    background: "#2E7D32",
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    borderRadius: 12,
    marginTop: 8,
  },
  btnDisabled: {
    background: "#a5d6a7",
    cursor: "not-allowed",
  },
  backBtn: {
    width: "100%",
    padding: "12px",
    background: "transparent",
    color: "#757575",
    fontSize: 14,
    marginTop: 12,
  },
  error: {
    color: "#c62828",
    fontSize: 13,
    marginBottom: 8,
  },
  footer: {
    marginTop: 32,
    textAlign: "center",
  },
  footerText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    lineHeight: 1.6,
  },
  link: {
    color: "rgba(255,255,255,0.95)",
    borderBottom: "1px solid rgba(255,255,255,0.5)",
  },
};
