import { useState, useEffect, useCallback } from "react";
import { API_BASE_URL } from "@/config";
import loginImg from "@/assets/login.png";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
    User, Mail, Lock, Briefcase, Building2,
    ArrowRight, ArrowLeft, Eye, EyeOff, Check, Users,
    Shield, Sparkles, ChevronRight
} from "lucide-react";

interface UserInfo {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    designation: string;
    company: string;
    department: string;
    phone: string;
}

interface WorkspaceInfo {
    name: string;
    type: string;
    teamSize: string;
    industry: string;
    invitedMembers: string;
}

interface ValidationErrors { [key: string]: string; }

function getPasswordStrength(pwd: string) {
    if (!pwd) return { score: 0, label: "", color: "", criteria: { hasMinLength: false, hasUppercase: false, hasLowercase: false, hasNumber: false, hasSpecial: false } };
    const criteria = {
        hasMinLength: pwd.length >= 8,
        hasUppercase: /[A-Z]/.test(pwd),
        hasLowercase: /[a-z]/.test(pwd),
        hasNumber: /[0-9]/.test(pwd),
        hasSpecial: /[^A-Za-z0-9]/.test(pwd),
    };
    const score = Object.values(criteria).filter(Boolean).length;
    const label = score === 5 ? "Strong" : score >= 3 ? "Fair" : "Weak";
    const color = score === 5 ? "#22c55e" : score >= 3 ? "#f59e0b" : "#ef4444";
    return { score, label, color, criteria };
}

function AnimatedStep({ children, stepKey, direction }: { children: React.ReactNode; stepKey: string | number; direction: "forward" | "backward" }) {
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const frame = requestAnimationFrame(() => setVisible(true));
        return () => { cancelAnimationFrame(frame); };
    }, [stepKey]);
    const tx = direction === "forward" ? "translateX(28px)" : "translateX(-28px)";
    return (
        <div style={{ opacity: visible ? 1 : 0, transform: visible ? "translateX(0)" : tx, transition: "opacity 0.32s cubic-bezier(.4,0,.2,1), transform 0.32s cubic-bezier(.4,0,.2,1)" }}>
            {children}
        </div>
    );
}

function FieldInput({ id, label, type = "text", placeholder, value, onChange, icon: Icon, error, autoFocus = false, suffix, onKeyDown }: {
    id: string; label: string; type?: string; placeholder?: string; value: string;
    onChange: (v: string) => void; icon?: React.ElementType; error?: string;
    autoFocus?: boolean; suffix?: React.ReactNode; onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}) {
    const [focused, setFocused] = useState(false);
    const isValid = value.length > 0 && !error;
    return (
        <div style={{ marginBottom: 0 }}>
            <label htmlFor={id} style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--color-foreground)", opacity: 0.65, letterSpacing: "0.025em", marginBottom: 4 }}>{label}</label>
            <div style={{ position: "relative" }}>
                {Icon && <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[14px] w-[14px] pointer-events-none" style={{ color: focused ? "var(--color-primary)" : "oklch(0.6 0 0)", transition: "color 0.2s" }} />}
                <input
                    id={id} type={type} placeholder={placeholder} value={value} autoFocus={autoFocus} autoComplete="off"
                    onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
                    onChange={(e) => onChange(e.target.value)} onKeyDown={onKeyDown}
                    style={{
                        height: 38, width: "100%", paddingLeft: Icon ? 38 : 12, paddingRight: suffix ? 38 : isValid ? 38 : 12,
                        borderRadius: 10, fontSize: 13, fontWeight: 500, boxSizing: "border-box",
                        border: `1.5px solid ${error ? "#ef4444" : focused ? "var(--color-primary)" : "var(--color-border)"}`,
                        background: "var(--color-background)", outline: "none", color: "var(--color-foreground)",
                        boxShadow: focused ? `0 0 0 3px ${error ? "rgba(239,68,68,0.1)" : "oklch(0.511 0.262 276.966 / 10%)"}` : "none",
                        transition: "border-color 0.2s, box-shadow 0.2s",
                    }}
                />
                {suffix && <div className="absolute right-3 top-1/2 -translate-y-1/2">{suffix}</div>}
                {isValid && !suffix && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 h-[18px] w-[18px] flex items-center justify-center rounded-full" style={{ background: "#22c55e" }}>
                        <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                    </div>
                )}
            </div>
            {error && <p style={{ fontSize: 11, fontWeight: 500, color: "#ef4444", marginTop: 3, paddingLeft: 2 }}>{error}</p>}
        </div>
    );
}

function SelectionCard({ selected, onClick, icon: IconComponent, title, desc }: {
    selected: boolean; onClick: () => void; icon: any; title: string; desc?: string;
}) {
    const [hovered, setHovered] = useState(false);
    return (
        <button type="button" onClick={onClick}
            onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
            style={{
                flex: 1, padding: "8px 10px", borderRadius: 10, cursor: "pointer", textAlign: "left",
                display: "flex", alignItems: "center", gap: 8,
                border: `2px solid ${selected ? "var(--color-primary)" : hovered ? "oklch(0.7 0 0)" : "var(--color-border)"}`,
                background: selected ? "oklch(0.511 0.262 276.966 / 6%)" : "var(--color-background)",
                boxShadow: selected ? "0 0 0 3px oklch(0.511 0.262 276.966 / 8%)" : "none",
                transform: selected ? "scale(1.01)" : "scale(1)",
                transition: "all 0.2s",
            }}
        >
            <div style={{ width: 28, height: 28, borderRadius: 6, background: selected ? "oklch(0.511 0.262 276.966 / 12%)" : "var(--color-muted)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.2s" }}>
                <IconComponent className="h-4 w-4" style={{ color: selected ? "var(--color-primary)" : "oklch(0.55 0 0)" }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: selected ? "var(--color-primary)" : "var(--color-foreground)", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</p>
                {desc && <p style={{ fontSize: 10, color: "oklch(0.6 0 0)", margin: "1px 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{desc}</p>}
            </div>
        </button>
    );
}

function ContinueButton({ onClick, loading = false, label = "Continue", disabled = false }: { onClick: () => void; loading?: boolean; label?: string; disabled?: boolean }) {
    const [hovered, setHovered] = useState(false);
    return (
        <button type="button" onClick={onClick} disabled={loading || disabled}
            onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
            style={{
                width: "100%", height: 40, borderRadius: 10, border: "none",
                background: loading || disabled ? "oklch(0.8 0 0)" : "var(--color-primary)",
                color: "#fff", fontSize: 14, fontWeight: 700, cursor: loading || disabled ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6, letterSpacing: "0.01em",
                boxShadow: loading || disabled ? "none" : hovered ? "0 6px 20px oklch(0.511 0.262 276.966 / 35%)" : "0 4px 12px oklch(0.511 0.262 276.966 / 24%)",
                transform: hovered && !loading && !disabled ? "translateY(-1px)" : "translateY(0)",
                transition: "background 0.2s, transform 0.15s, box-shadow 0.2s",
            }}
        >
            {loading ? (
                <>
                    <span style={{ width: 14, height: 14, border: "2.5px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "reg-spin 0.7s linear infinite" }} />
                    {label}
                </>
            ) : (
                <>{label}<ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} /></>
            )}
        </button>
    );
}

function SkipButton({ onClick, label = "Skip for now" }: { onClick: () => void; label?: string }) {
    const [hovered, setHovered] = useState(false);
    return (
        <button type="button" onClick={onClick}
            onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
            style={{ width: "100%", height: 36, border: "none", background: "transparent", color: hovered ? "var(--color-foreground)" : "oklch(0.58 0 0)", fontSize: 12, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4, transition: "color 0.15s" }}
        >
            {label} <ChevronRight className="h-3.5 w-3.5" />
        </button>
    );
}

function BackButton({ onClick }: { onClick: () => void }) {
    const [hovered, setHovered] = useState(false);
    return (
        <button type="button" onClick={onClick}
            onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
            style={{ background: "none", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, color: hovered ? "var(--color-foreground)" : "oklch(0.55 0 0)", fontSize: 13, fontWeight: 500, padding: "0 0 10px", transition: "color 0.15s" }}
        >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
    );
}

const WORKSPACE_TYPES = [
    { id: "Personal", title: "Personal", desc: "Private space", icon: User },
    { id: "Team", title: "Team", desc: "Small group", icon: Users },
    { id: "Company", title: "Company", desc: "Organisation", icon: Building2 },
];

export default function Register() {
    const navigate = useNavigate();
    const { login } = useAuth();

    const [phase, setPhase] = useState<"account" | "verify_email" | "setup" | "done">("account");
    const [direction, setDirection] = useState<"forward" | "backward">("forward");
    const [isInvited, setIsInvited] = useState(false);
    const [loading, setLoading] = useState(false);
    const [globalError, setGlobalError] = useState("");

    const [userInfo, setUserInfo] = useState<UserInfo>({ name: "", email: "", password: "", confirmPassword: "", designation: "", company: "", department: "", phone: "" });
    const [workspaceInfo, setWorkspaceInfo] = useState<WorkspaceInfo>({ name: "", type: "Personal", teamSize: "Just me", industry: "General", invitedMembers: "" });

    const [otpCode, setOtpCode] = useState("");
    const [registrationToken, setRegistrationToken] = useState("");
    const [otpCooldown, setOtpCooldown] = useState(0);
    const [otpError, setOtpError] = useState("");

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [errors, setErrors] = useState<ValidationErrors>({});
    const [showInviteSection, setShowInviteSection] = useState(false);

    const pwStrength = getPasswordStrength(userInfo.password);

    useEffect(() => { if (localStorage.getItem("token")) navigate("/"); }, [navigate]);

    useEffect(() => {
        if (otpCooldown > 0) {
            const timer = setTimeout(() => setOtpCooldown(c => c - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [otpCooldown]);

    const setField = useCallback((field: keyof UserInfo, value: string) => {
        setUserInfo(prev => ({ ...prev, [field]: value }));
        setErrors(prev => ({ ...prev, [field]: "" }));
    }, []);

    const setWsField = useCallback((field: keyof WorkspaceInfo, value: string) => {
        setWorkspaceInfo(prev => ({ ...prev, [field]: value }));
        setErrors(prev => ({ ...prev, [field]: "" }));
    }, []);

    const fw = () => setDirection("forward");
    const bk = () => setDirection("backward");

    const validateAccount = () => {
        const e: ValidationErrors = {};
        if (!userInfo.name.trim()) e.name = "What should we call you?";
        if (!userInfo.email.includes("@")) e.email = "Enter a valid email address.";
        if (pwStrength.score < 5) e.password = "Use 8+ chars with uppercase, number & symbol.";
        if (userInfo.password !== userInfo.confirmPassword) e.confirmPassword = "Passwords don't match.";
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleAccountNext = async () => {
        if (!validateAccount()) return;
        setLoading(true);
        setGlobalError("");
        try {
            try {
                const res = await fetch(`${API_BASE_URL}/api/auth/check-invitation?email=${encodeURIComponent(userInfo.email.trim())}`);
                const data = await res.json();
                setIsInvited(res.ok ? data.hasInvitation : false);
            } catch { 
                setIsInvited(false); 
            }

            const otpRes = await fetch(`${API_BASE_URL}/api/auth/send-registration-otp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: userInfo.email.trim().toLowerCase() }),
            });
            const otpData = await otpRes.json();
            if (!otpRes.ok) {
                throw new Error(otpData.message || "Failed to send verification code.");
            }

            setOtpCooldown(30);
            fw();
            setPhase("verify_email");
            setOtpCode("");
            setOtpError("");
        } catch (err: any) {
            setGlobalError(err.message || "Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async () => {
        if (otpCode.trim().length !== 6) {
            setOtpError("Please enter the 6-digit verification code.");
            return;
        }
        setLoading(true);
        setOtpError("");
        setGlobalError("");
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/verify-registration-otp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: userInfo.email.trim().toLowerCase(),
                    code: otpCode.trim()
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || "Invalid or expired verification code.");
            }

            setRegistrationToken(data.registrationToken);
            fw();

            if (isInvited) {
                await executeRegistration(data.registrationToken, true);
            } else {
                setPhase("setup");
            }
        } catch (err: any) {
            setOtpError(err.message || "An error occurred during verification.");
        } finally {
            setLoading(false);
        }
    };

    const handleResendOTP = async () => {
        if (otpCooldown > 0) return;
        setLoading(true);
        setOtpError("");
        setGlobalError("");
        try {
            const otpRes = await fetch(`${API_BASE_URL}/api/auth/send-registration-otp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: userInfo.email.trim().toLowerCase() }),
            });
            const otpData = await otpRes.json();
            if (!otpRes.ok) {
                throw new Error(otpData.message || "Failed to resend verification code.");
            }
            setOtpCooldown(30);
        } catch (err: any) {
            setOtpError(err.message || "Failed to resend verification code.");
        } finally {
            setLoading(false);
        }
    };

    const executeRegistration = async (regToken?: string, skipWorkspaceCreation = false) => {
        setLoading(true);
        setGlobalError("");
        const tokenToUse = regToken || registrationToken;
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: userInfo.name.trim(),
                    email: userInfo.email.trim().toLowerCase(),
                    password: userInfo.password,
                    designation: userInfo.designation.trim(),
                    company: userInfo.company.trim(),
                    department: userInfo.department.trim(),
                    phone: userInfo.phone.trim(),
                    location: "",
                    timezone: "GMT+5:30 (IST)",
                    registrationToken: tokenToUse
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Registration failed");
            login(data.token, data.user);

            if (!isInvited && !skipWorkspaceCreation) {
                const wsName = workspaceInfo.name.trim() || `${userInfo.name.trim()}'s Workspace`;
                const emails = workspaceInfo.invitedMembers.split(/[\s,;]+/).map(e => e.trim()).filter(e => e.includes("@"));
                const wsRes = await fetch(`${API_BASE_URL}/api/workspaces`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.token}` },
                    body: JSON.stringify({
                        name: wsName,
                        type: workspaceInfo.type || "Personal",
                        teamSize: workspaceInfo.teamSize || "Just me",
                        industry: workspaceInfo.industry.trim() || "General",
                        members: emails
                    })
                });
                const wsData = await wsRes.json();
                if (!wsRes.ok) throw new Error(wsData.message || "Workspace creation failed");
            }

            setPhase("done");
            setTimeout(() => navigate("/"), 1400);
        } catch (err: any) {
            setGlobalError(err.message || "Something went wrong. Please try again.");
            setPhase("setup");
        } finally {
            setLoading(false);
        }
    };

    const kEnter = (cb: () => void) => (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter") cb(); };

    const totalSteps = 3;
    const currentStep = phase === "account" ? 1 : phase === "verify_email" ? 2 : 3;
    const progressPct = phase === "done" ? 100 : Math.round((currentStep / totalSteps) * 100);

    return (
        <>
            <style>{`
                @keyframes reg-spin { to { transform: rotate(360deg); } }
                @keyframes reg-fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes reg-pop { from { opacity: 0; transform: scale(0.75); } to { opacity: 1; transform: scale(1); } }
            `}</style>

            <div className="min-h-screen bg-muted/50 flex items-center justify-center p-4 sm:p-6 transition-colors lg:overflow-hidden" style={{ fontFamily: "'Inter Variable', system-ui, sans-serif" }}>
                <div className="w-full max-w-5xl grid lg:grid-cols-2 bg-card text-card-foreground rounded-3xl shadow-xl border border-border/60 overflow-hidden lg:h-[min(630px,90vh)]">

                    {/* Left image panel */}
                    <div className="relative hidden lg:block p-3 bg-background h-full">
                        <img
                            src={loginImg}
                            alt="dotheThing workspace preview"
                            className="h-full w-full object-cover rounded-2xl border border-border/40 shadow-xs"
                        />
                    </div>

                    {/* Right form panel */}
                    <div className="flex flex-col justify-center p-6 sm:p-10 lg:p-8 h-full relative overflow-y-auto">

                        {/* Progress bar */}
                        {phase !== "done" && (
                            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "var(--color-border)" }}>
                                <div style={{ height: "100%", width: `${progressPct}%`, background: "var(--color-primary)", borderRadius: "0 2px 2px 0", transition: "width 0.5s cubic-bezier(.4,0,.2,1)" }} />
                            </div>
                        )}

                    <div style={{ width: "100%", maxWidth: 420, margin: "0 auto" }}>
                        {/* Done */}
                        {phase === "done" && (
                            <div style={{ textAlign: "center", padding: "20px 0", animation: "reg-fadeUp 0.4s ease forwards" }}>
                                <div style={{ width: 68, height: 68, borderRadius: "50%", background: "#22c55e", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 18, boxShadow: "0 8px 24px rgba(34,197,94,0.32)", animation: "reg-pop 0.45s cubic-bezier(.34,1.56,.64,1) forwards" }}>
                                    <Check className="h-7 w-7 text-white" strokeWidth={3} />
                                </div>
                                <h2 style={{ fontSize: 21, fontWeight: 800, color: "var(--color-foreground)", margin: "0 0 6px", letterSpacing: "-0.02em" }}>You're all set! 🎉</h2>
                                <p style={{ fontSize: 13, color: "oklch(0.55 0 0)", margin: 0 }}>Taking you to your workspace…</p>
                            </div>
                        )}

                        {/* STEP 1: ACCOUNT */}
                        {phase === "account" && (
                            <AnimatedStep stepKey="account" direction={direction}>
                                <div style={{ marginBottom: 16 }}>
                                    <p style={{ fontSize: 11, fontWeight: 600, color: "var(--color-primary)", letterSpacing: "0.06em", textTransform: "uppercase", margin: "0 0 4px" }}>Step 1 of 3</p>
                                    <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.025em", color: "var(--color-foreground)", margin: "0 0 4px", lineHeight: 1.25 }}>Create your account</h2>
                                    <p style={{ fontSize: 12, color: "oklch(0.55 0 0)", margin: 0, lineHeight: 1.4 }}>Takes less than a minute. No credit card needed.</p>
                                </div>

                                {globalError && (
                                    <div style={{ padding: "8px 12px", borderRadius: 10, background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.18)", color: "#dc2626", fontSize: 12, fontWeight: 500, marginBottom: 12 }}>{globalError}</div>
                                )}

                                <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                                    <FieldInput id="name" label="Full name" placeholder="e.g. Aria Chen" value={userInfo.name} onChange={v => setField("name", v)} icon={User} error={errors.name} autoFocus onKeyDown={kEnter(handleAccountNext)} />
                                    <FieldInput id="email" label="Work email" type="email" placeholder="you@company.com" value={userInfo.email} onChange={v => setField("email", v)} icon={Mail} error={errors.email} onKeyDown={kEnter(handleAccountNext)} />
                                    <FieldInput id="password" label="Password" type={showPassword ? "text" : "password"} placeholder="Min. 8 characters" value={userInfo.password} onChange={v => setField("password", v)} icon={Lock} error={errors.password} onKeyDown={kEnter(handleAccountNext)}
                                        suffix={<button type="button" onClick={() => setShowPassword(p => !p)} style={{ background: "none", border: "none", cursor: "pointer", color: "oklch(0.55 0 0)", display: "flex", alignItems: "center", padding: 0 }}>{showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</button>}
                                    />

                                    {userInfo.password && (
                                        <div style={{ padding: "8px 10px", borderRadius: 10, background: "var(--color-muted)", border: "1px solid var(--color-border)" }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                                                <span style={{ fontSize: 10, fontWeight: 600, color: "oklch(0.55 0 0)" }}>Password strength</span>
                                                <span style={{ fontSize: 10, fontWeight: 700, color: pwStrength.color }}>{pwStrength.label}</span>
                                            </div>
                                            <div style={{ height: 3, borderRadius: 99, background: "var(--color-border)", overflow: "hidden" }}>
                                                <div style={{ height: "100%", width: `${(pwStrength.score / 5) * 100}%`, background: pwStrength.color, borderRadius: 99, transition: "width 0.4s, background 0.3s" }} />
                                            </div>
                                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 6px", marginTop: 6 }}>
                                                {([["hasMinLength", "8+ characters"], ["hasUppercase", "Uppercase"], ["hasLowercase", "Lowercase"], ["hasNumber", "Number"], ["hasSpecial", "Symbol"]] as [string, string][]).map(([k, txt]) => {
                                                    const met = pwStrength.criteria[k as keyof typeof pwStrength.criteria];
                                                    return (
                                                        <div key={k} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                                            <div style={{ width: 5, height: 5, borderRadius: "50%", background: met ? "#22c55e" : "oklch(0.8 0 0)", transition: "background 0.3s" }} />
                                                            <span style={{ fontSize: 10, color: met ? "oklch(0.4 0 0)" : "oklch(0.65 0 0)" }}>{txt}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    <FieldInput id="confirmPassword" label="Confirm password" type={showConfirmPassword ? "text" : "password"} placeholder="Repeat your password" value={userInfo.confirmPassword} onChange={v => setField("confirmPassword", v)} icon={Lock} error={errors.confirmPassword} onKeyDown={kEnter(handleAccountNext)}
                                        suffix={<button type="button" onClick={() => setShowConfirmPassword(p => !p)} style={{ background: "none", border: "none", cursor: "pointer", color: "oklch(0.55 0 0)", display: "flex", alignItems: "center", padding: 0 }}>{showConfirmPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</button>}
                                    />
                                </div>

                                <div style={{ marginTop: 16 }}>
                                    <ContinueButton onClick={handleAccountNext} loading={loading} label={loading ? "Sending Code..." : "Continue to Verification"} />
                                </div>
                                <p style={{ textAlign: "center", fontSize: 12, color: "oklch(0.55 0 0)", marginTop: 12 }}>
                                    Already have an account?{" "}
                                    <Link to="/login" style={{ color: "var(--color-primary)", fontWeight: 600, textDecoration: "none" }}>Sign in</Link>
                                </p>
                            </AnimatedStep>
                        )}

                        {/* STEP 2: VERIFY EMAIL */}
                        {phase === "verify_email" && (
                            <AnimatedStep stepKey="verify_email" direction={direction}>
                                <BackButton onClick={() => { bk(); setPhase("account"); }} />
                                <div style={{ marginBottom: 16 }}>
                                    <p style={{ fontSize: 11, fontWeight: 600, color: "var(--color-primary)", letterSpacing: "0.06em", textTransform: "uppercase", margin: "0 0 4px" }}>Step 2 of 3</p>
                                    <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.025em", color: "var(--color-foreground)", margin: "0 0 4px", lineHeight: 1.25 }}>Verify your email</h2>
                                    <p style={{ fontSize: 12, color: "oklch(0.55 0 0)", margin: 0, lineHeight: 1.4 }}>
                                        We sent a 6-digit code to <strong style={{ color: "var(--color-foreground)" }}>{userInfo.email}</strong>.
                                    </p>
                                </div>

                                {otpError && (
                                    <div style={{ padding: "8px 12px", borderRadius: 10, background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.18)", color: "#dc2626", fontSize: 12, fontWeight: 500, marginBottom: 12 }}>{otpError}</div>
                                )}

                                <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                                    <FieldInput 
                                        id="otpCode" 
                                        label="Verification Code" 
                                        placeholder="e.g. 123456" 
                                        value={otpCode} 
                                        onChange={v => {
                                            const val = v.replace(/[^0-9]/g, "").slice(0, 6);
                                            setOtpCode(val);
                                            setOtpError("");
                                        }} 
                                        icon={Shield} 
                                        autoFocus 
                                        onKeyDown={kEnter(handleVerifyOTP)} 
                                    />
                                </div>

                                <div style={{ marginTop: 16 }}>
                                    <ContinueButton onClick={handleVerifyOTP} loading={loading} label={loading ? "Verifying..." : "Verify Code & Continue"} />
                                </div>

                                <div style={{ textAlign: "center", marginTop: 12 }}>
                                    <button 
                                        type="button" 
                                        onClick={handleResendOTP} 
                                        disabled={loading || otpCooldown > 0} 
                                        style={{ 
                                            background: "none", 
                                            border: "none", 
                                            cursor: otpCooldown > 0 ? "not-allowed" : "pointer", 
                                            color: otpCooldown > 0 ? "oklch(0.65 0 0)" : "var(--color-primary)", 
                                            fontWeight: 600, 
                                            fontSize: 12, 
                                            textDecoration: "none" 
                                        }}
                                    >
                                        {otpCooldown > 0 ? `Resend code in ${otpCooldown}s` : "Resend Verification Code"}
                                    </button>
                                </div>
                            </AnimatedStep>
                        )}

                        {/* STEP 3: CONSOLIDATED SETUP PAGE */}
                        {phase === "setup" && (
                            <AnimatedStep stepKey="setup" direction={direction}>
                                <div style={{ marginBottom: 16 }}>
                                    <p style={{ fontSize: 11, fontWeight: 600, color: "var(--color-primary)", letterSpacing: "0.06em", textTransform: "uppercase", margin: "0 0 4px" }}>Step 3 of 3</p>
                                    <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.025em", color: "var(--color-foreground)", margin: "0 0 4px", lineHeight: 1.25 }}>Set up your workspace</h2>
                                    <p style={{ fontSize: 12, color: "oklch(0.55 0 0)", margin: 0, lineHeight: 1.4 }}>Name your workspace and optional details to finish setup.</p>
                                </div>

                                {globalError && (
                                    <div style={{ padding: "8px 12px", borderRadius: 10, background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.18)", color: "#dc2626", fontSize: 12, fontWeight: 500, marginBottom: 12 }}>{globalError}</div>
                                )}

                                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                    {/* Workspace Name */}
                                    <FieldInput 
                                        id="wsName" 
                                        label="Workspace Name" 
                                        placeholder="e.g. Acme Projects" 
                                        value={workspaceInfo.name} 
                                        onChange={v => setWsField("name", v)} 
                                        icon={Building2} 
                                        error={errors.workspaceName} 
                                        autoFocus 
                                        onKeyDown={kEnter(() => executeRegistration())} 
                                    />

                                    {/* Workspace Type Pills */}
                                    <div>
                                        <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--color-foreground)", opacity: 0.65, letterSpacing: "0.025em", marginBottom: 6 }}>Workspace Type</label>
                                        <div style={{ display: "flex", gap: 6 }}>
                                            {WORKSPACE_TYPES.map(t => (
                                                <SelectionCard 
                                                    key={t.id} 
                                                    selected={workspaceInfo.type === t.id} 
                                                    onClick={() => setWsField("type", t.id)} 
                                                    title={t.title} 
                                                    desc={t.desc} 
                                                    icon={t.icon} 
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    {/* Job Title / Role */}
                                    <FieldInput 
                                        id="designation" 
                                        label="Your Job Title (Optional)" 
                                        placeholder="e.g. Product Manager, Engineer" 
                                        value={userInfo.designation} 
                                        onChange={v => setField("designation", v)} 
                                        icon={Briefcase} 
                                        onKeyDown={kEnter(() => executeRegistration())} 
                                    />

                                    {/* Toggle Invite Members */}
                                    <div>
                                        <button 
                                            type="button" 
                                            onClick={() => setShowInviteSection(p => !p)} 
                                            style={{ background: "none", border: "none", padding: 0, color: "var(--color-primary)", fontSize: 11, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}
                                        >
                                            <Sparkles className="h-3 w-3" />
                                            {showInviteSection ? "Hide team invitations" : "+ Invite team members (Optional)"}
                                        </button>

                                        {showInviteSection && (
                                            <div style={{ marginTop: 8 }}>
                                                <textarea 
                                                    id="wsInvites" 
                                                    placeholder={"colleague@company.com\nanother@team.com"} 
                                                    rows={2} 
                                                    value={workspaceInfo.invitedMembers}
                                                    onChange={e => setWsField("invitedMembers", e.target.value)}
                                                    style={{ width: "100%", paddingLeft: 12, paddingRight: 12, paddingTop: 8, paddingBottom: 8, borderRadius: 10, fontSize: 12, fontWeight: 500, border: "1.5px solid var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)", outline: "none", resize: "none", fontFamily: "inherit", lineHeight: 1.4, boxSizing: "border-box" }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 4 }}>
                                    <ContinueButton 
                                        onClick={() => executeRegistration()} 
                                        loading={loading} 
                                        label={loading ? "Launching workspace..." : "Launch Workspace 🚀"} 
                                    />
                                    <SkipButton 
                                        onClick={() => executeRegistration(undefined, true)} 
                                        label="Skip & Go to Dashboard" 
                                    />
                                </div>
                            </AnimatedStep>
                        )}
                    </div>

                    {phase !== "done" && (
                        <p style={{ textAlign: "center", fontSize: 11, color: "oklch(0.65 0 0)", marginTop: 12, lineHeight: 1.4 }}>
                            By continuing, you agree to our{" "}
                            <a href="#" style={{ color: "var(--color-primary)", textDecoration: "none" }}>Terms of Service</a>{" "}and{" "}
                            <a href="#" style={{ color: "var(--color-primary)", textDecoration: "none" }}>Privacy Policy</a>
                        </p>
                    )}
                    </div>
                </div>
            </div>
        </>
    );
}
