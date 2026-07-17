import { useState, useEffect, useCallback } from "react";
import { API_BASE_URL } from "@/config";
import loginImg from "@/assets/login.png";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
    User, Mail, Lock, Briefcase, Building2, Phone,
    ArrowRight, ArrowLeft, Eye, EyeOff, Check, Users,
    Sparkles, Shield, Zap, Globe, ChevronRight
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
                width: "100%", padding: "10px 14px", borderRadius: 10, cursor: "pointer", textAlign: "left",
                display: "flex", alignItems: "center", gap: 10,
                border: `2px solid ${selected ? "var(--color-primary)" : hovered ? "oklch(0.7 0 0)" : "var(--color-border)"}`,
                background: selected ? "oklch(0.511 0.262 276.966 / 6%)" : "var(--color-background)",
                boxShadow: selected ? "0 0 0 4px oklch(0.511 0.262 276.966 / 8%)" : "none",
                transform: selected ? "scale(1.01)" : "scale(1)",
                transition: "all 0.2s",
            }}
        >
            <div style={{ width: 32, height: 32, borderRadius: 8, background: selected ? "oklch(0.511 0.262 276.966 / 12%)" : "var(--color-muted)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.2s" }}>
                <IconComponent className="h-4.5 w-4.5" style={{ color: selected ? "var(--color-primary)" : "oklch(0.55 0 0)" }} />
            </div>
            <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: selected ? "var(--color-primary)" : "var(--color-foreground)", margin: 0 }}>{title}</p>
                {desc && <p style={{ fontSize: 11, color: "oklch(0.6 0 0)", margin: "2px 0 0" }}>{desc}</p>}
            </div>
            <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${selected ? "var(--color-primary)" : "var(--color-border)"}`, background: selected ? "var(--color-primary)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s" }}>
                {selected && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
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


function SkipButton({ onClick }: { onClick: () => void }) {
    const [hovered, setHovered] = useState(false);
    return (
        <button type="button" onClick={onClick}
            onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
            style={{ width: "100%", height: 40, border: "none", background: "transparent", color: hovered ? "var(--color-foreground)" : "oklch(0.58 0 0)", fontSize: 13, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4, transition: "color 0.15s" }}
        >
            Skip for now <ChevronRight className="h-3.5 w-3.5" />
        </button>
    );
}

// â”€â”€â”€ TipCard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function TipCard({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
    return (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", borderRadius: 12, background: "oklch(0.511 0.262 276.966 / 5%)", border: "1px solid oklch(0.511 0.262 276.966 / 15%)" }}>
            <Icon className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "var(--color-primary)" }} />
            <p style={{ fontSize: 12, lineHeight: 1.55, color: "oklch(0.52 0 0)", margin: 0 }}>{text}</p>
        </div>
    );
}

// â”€â”€â”€ BackButton â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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


const PROFILE_STEPS = ["designation", "company", "department", "phone"] as const;
const WORKSPACE_STEPS = ["workspaceName", "workspaceType", "workspaceTeamSize", "workspaceIndustry", "workspaceInviteMembers"] as const;

const WORKSPACE_TYPES = [
    { id: "Personal", title: "Personal", desc: "A private space just for you", icon: User },
    { id: "Team", title: "Team", desc: "Collaborate with a small group", icon: Users },
    { id: "Company", title: "Company", desc: "Organisation-wide workspace", icon: Building2 },
];

const TEAM_SIZES = [
    { id: "Just me", label: "Just me", icon: User },
    { id: "2–10", label: "2–10 people", icon: Users },
    { id: "11–50", label: "11–50 people", icon: Building2 },
    { id: "50+", label: "50+ people", icon: Building2 },
];

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Register() {
    const navigate = useNavigate();
    const { login } = useAuth();

    const [phase, setPhase] = useState<"account" | "verify_email" | "profile" | "workspace" | "done">("account");
    const [profileStep, setProfileStep] = useState(0);
    const [workspaceStep, setWorkspaceStep] = useState(0);
    const [direction, setDirection] = useState<"forward" | "backward">("forward");
    const [isInvited, setIsInvited] = useState(false);
    const [loading, setLoading] = useState(false);
    const [globalError, setGlobalError] = useState("");

    const [userInfo, setUserInfo] = useState<UserInfo>({ name: "", email: "", password: "", confirmPassword: "", designation: "", company: "", department: "", phone: "" });
    const [workspaceInfo, setWorkspaceInfo] = useState<WorkspaceInfo>({ name: "", type: "Personal", teamSize: "Just me", industry: "", invitedMembers: "" });

    const [otpCode, setOtpCode] = useState("");
    const [registrationToken, setRegistrationToken] = useState("");
    const [otpCooldown, setOtpCooldown] = useState(0);
    const [otpError, setOtpError] = useState("");

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [errors, setErrors] = useState<ValidationErrors>({});

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

    // Validation
    const validateAccount = () => {
        const e: ValidationErrors = {};
        if (!userInfo.name.trim()) e.name = "What should we call you?";
        if (!userInfo.email.includes("@")) e.email = "Enter a valid email address.";
        if (pwStrength.score < 5) e.password = "Use 8+ chars with uppercase, number & symbol.";
        if (userInfo.password !== userInfo.confirmPassword) e.confirmPassword = "Passwords don't match.";
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    // Navigation
    const handleAccountNext = async () => {
        if (!validateAccount()) return;
        setLoading(true);
        setGlobalError("");
        try {
            // First check if invitation exists
            try {
                const res = await fetch(`${API_BASE_URL}/api/auth/check-invitation?email=${encodeURIComponent(userInfo.email.trim())}`);
                const data = await res.json();
                setIsInvited(res.ok ? data.hasInvitation : false);
            } catch { 
                setIsInvited(false); 
            }

            // Send registration OTP
            const otpRes = await fetch(`${API_BASE_URL}/api/auth/send-registration-otp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: userInfo.email.trim().toLowerCase() }),
            });
            const otpData = await otpRes.json();
            if (!otpRes.ok) {
                throw new Error(otpData.message || "Failed to send verification code.");
            }

            // Success -> transition to verify_email
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

            // Store token and proceed to profile step
            setRegistrationToken(data.registrationToken);
            fw();
            setPhase("profile");
            setProfileStep(0);
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

    const handleProfileNext = () => {
        fw();
        if (profileStep < PROFILE_STEPS.length - 1) { setProfileStep(p => p + 1); }
        else { isInvited ? handleRegister() : (setPhase("workspace"), setWorkspaceStep(0)); }
    };

    const handleProfileBack = () => {
        bk();
        if (profileStep > 0) setProfileStep(p => p - 1);
        else setPhase("verify_email");
    };

    const handleWorkspaceNext = () => {
        const sn = WORKSPACE_STEPS[workspaceStep];
        if (sn === "workspaceName" && !workspaceInfo.name.trim()) { setErrors({ workspaceName: "Your workspace needs a name." }); return; }
        if (sn === "workspaceIndustry" && !workspaceInfo.industry.trim()) { setErrors({ workspaceIndustry: "Tell us your industry." }); return; }
        fw();
        if (workspaceStep < WORKSPACE_STEPS.length - 1) setWorkspaceStep(p => p + 1);
        else handleRegister();
    };

    const handleWorkspaceBack = () => {
        bk();
        if (workspaceStep > 0) setWorkspaceStep(p => p - 1);
        else { setPhase("profile"); setProfileStep(PROFILE_STEPS.length - 1); }
    };

    const handleRegister = async () => {
        setLoading(true); setGlobalError("");
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: userInfo.name.trim(), email: userInfo.email.trim().toLowerCase(), password: userInfo.password, designation: userInfo.designation.trim(), company: userInfo.company.trim(), department: userInfo.department.trim(), phone: userInfo.phone.trim(), location: "", timezone: "GMT+5:30 (IST)", registrationToken }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Registration failed");
            login(data.token, data.user);
            if (!isInvited) {
                const emails = workspaceInfo.invitedMembers.split(/[\s,;]+/).map(e => e.trim()).filter(e => e.includes("@"));
                const wsRes = await fetch(`${API_BASE_URL}/api/workspaces`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.token}` }, body: JSON.stringify({ name: workspaceInfo.name.trim(), type: workspaceInfo.type, teamSize: workspaceInfo.teamSize, industry: workspaceInfo.industry.trim(), members: emails }) });
                const wsData = await wsRes.json();
                if (!wsRes.ok) throw new Error(wsData.message || "Workspace creation failed");
            }
            setPhase("done");
            setTimeout(() => navigate("/"), 1600);
        } catch (err: any) {
            setGlobalError(err.message || "Something went wrong. Please try again.");
            if (phase === "profile" || (phase === "workspace" && workspaceStep === WORKSPACE_STEPS.length - 1)) setPhase("workspace");
        } finally { setLoading(false); }
    };

    const kEnter = (cb: () => void) => (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter") cb(); };

    // Styles helpers
    const phaseLabel = (label: string, cur: number, total: number) => (
        <p style={{ fontSize: 11, fontWeight: 600, color: "var(--color-primary)", letterSpacing: "0.06em", textTransform: "uppercase", margin: "0 0 4px" }}>
            {label} · {cur} of {total}
        </p>
    );

    const stepHeading = (title: string, sub: string) => (
        <>
            <h2 style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.025em", color: "var(--color-foreground)", margin: "0 0 4px", lineHeight: 1.25 }}>{title}</h2>
            <p style={{ fontSize: 12, color: "oklch(0.55 0 0)", margin: "0 0 16px", lineHeight: 1.4 }}>{sub}</p>
        </>
    );

    // Progress
    const totalSteps = isInvited 
        ? 2 + PROFILE_STEPS.length 
        : 2 + PROFILE_STEPS.length + WORKSPACE_STEPS.length;
    const currentStep = phase === "account" 
        ? 0 
        : phase === "verify_email" 
        ? 1 
        : phase === "profile" 
        ? 2 + profileStep 
        : 2 + PROFILE_STEPS.length + workspaceStep;
    const progressPct = totalSteps > 1 ? Math.round((currentStep / (totalSteps - 1)) * 100) : 0;

    return (
        <>
            <style>{`
                @keyframes reg-spin { to { transform: rotate(360deg); } }
                @keyframes reg-fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes reg-pop { from { opacity: 0; transform: scale(0.75); } to { opacity: 1; transform: scale(1); } }
            `}</style>

            <div className="min-h-screen bg-muted/50 flex items-center justify-center p-4 sm:p-6 transition-colors lg:overflow-hidden" style={{ fontFamily: "'Inter Variable', system-ui, sans-serif" }}>
                <div className="w-full max-w-5xl grid lg:grid-cols-2 bg-card text-card-foreground rounded-3xl shadow-xl border border-border/60 overflow-hidden lg:h-[min(630px,90vh)]">

                    {/* ── Left image panel (lg+) ─────────────────────────── */}
                    <div className="relative hidden lg:block p-3 bg-background h-full">
                        <img
                            src={loginImg}
                            alt="dotheThing workspace preview"
                            className="h-full w-full object-cover rounded-2xl border border-border/40 shadow-xs"
                        />
                    </div>

                    {/* ── Right form panel ───────────────────────────────── */}
                    <div className="flex flex-col justify-center p-6 sm:p-10 lg:p-8 h-full relative overflow-y-auto">

                        {/* Progress bar — sits at top of right panel */}
                        {phase !== "done" && (
                            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "var(--color-border)" }}>
                                <div style={{ height: "100%", width: `${progressPct}%`, background: "var(--color-primary)", borderRadius: "0 2px 2px 0", transition: "width 0.5s cubic-bezier(.4,0,.2,1)" }} />
                            </div>
                        )}

                    <div style={{ width: "100%", maxWidth: 400, margin: "0 auto" }}>
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

                        {/* ACCOUNT */}
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
                                    <ContinueButton onClick={handleAccountNext} loading={loading} label={loading ? "Checking" : "Create Account"} />
                                </div>
                                <p style={{ textAlign: "center", fontSize: 12, color: "oklch(0.55 0 0)", marginTop: 12 }}>
                                    Already have an account?{" "}
                                    <Link to="/login" style={{ color: "var(--color-primary)", fontWeight: 600, textDecoration: "none" }}>Sign in</Link>
                                </p>
                            </AnimatedStep>
                        )}

                        {/* VERIFY EMAIL */}
                        {phase === "verify_email" && (
                            <AnimatedStep stepKey="verify_email" direction={direction}>
                                <BackButton onClick={() => { bk(); setPhase("account"); }} />
                                <div style={{ marginBottom: 16 }}>
                                    <p style={{ fontSize: 11, fontWeight: 600, color: "var(--color-primary)", letterSpacing: "0.06em", textTransform: "uppercase", margin: "0 0 4px" }}>Step 2 of {totalSteps}</p>
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
                                    <ContinueButton onClick={handleVerifyOTP} loading={loading} label={loading ? "Verifying..." : "Verify Code"} />
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

                        {/* PROFILE */}
                        {phase === "profile" && (
                            <AnimatedStep stepKey={`profile-${profileStep}`} direction={direction}>
                                <BackButton onClick={handleProfileBack} />
                                {phaseLabel("Your profile", profileStep + 1, PROFILE_STEPS.length)}

                                {PROFILE_STEPS[profileStep] === "designation" && (
                                    <>
                                        {stepHeading("What's your role?", "Your title is shown to teammates and helps personalise your experience.")}
                                        <FieldInput id="designation" label="Job title" placeholder="e.g. Senior Product Designer" value={userInfo.designation} onChange={v => setField("designation", v)} icon={Briefcase} autoFocus onKeyDown={kEnter(handleProfileNext)} />
                                        <div style={{ marginTop: 10 }}><TipCard icon={Zap} text="Your designation helps us suggest the right templates and workflows for your role." /></div>
                                    </>
                                )}

                                {PROFILE_STEPS[profileStep] === "company" && (
                                    <>
                                        {stepHeading("Where do you work?", "Connecting you to the right organisation context for better collaboration.")}
                                        <FieldInput id="company" label="Company name" placeholder="e.g. Acme Inc." value={userInfo.company} onChange={v => setField("company", v)} icon={Building2} autoFocus onKeyDown={kEnter(handleProfileNext)} />
                                        <div style={{ marginTop: 10 }}><TipCard icon={Globe} text="Your company name is visible to teammates in shared workspaces." /></div>
                                    </>
                                )}

                                {PROFILE_STEPS[profileStep] === "department" && (
                                    <>
                                        {stepHeading("Which department?", "We'll suggest the best board templates for your team's workflow.")}
                                        <FieldInput id="department" label="Department" placeholder="e.g. Product, Engineering, Design" value={userInfo.department} onChange={v => setField("department", v)} icon={Briefcase} autoFocus onKeyDown={kEnter(handleProfileNext)} />
                                        <div style={{ marginTop: 10 }}><TipCard icon={Sparkles} text="Department info helps us pre-load workflows tailored to how your team operates." /></div>
                                    </>
                                )}

                                {PROFILE_STEPS[profileStep] === "phone" && (
                                    <>
                                        {stepHeading("Your phone number", "Used only for account security — never for marketing.")}
                                        <FieldInput id="phone" label="Phone number" type="tel" placeholder="+1 (555) 000-0000" value={userInfo.phone} onChange={v => setField("phone", v)} icon={Phone} autoFocus onKeyDown={kEnter(handleProfileNext)} />
                                        <div style={{ marginTop: 10 }}><TipCard icon={Shield} text="Your number is encrypted and never shared with any third party." /></div>
                                    </>
                                )}

                                <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 3 }}>
                                    <ContinueButton onClick={handleProfileNext} loading={loading && profileStep === PROFILE_STEPS.length - 1}
                                        label={loading && profileStep === PROFILE_STEPS.length - 1 ? "Setting up" : profileStep === PROFILE_STEPS.length - 1 && isInvited ? "Finish Setup" : "Continue"} />
                                    <SkipButton onClick={() => { fw(); if (profileStep < PROFILE_STEPS.length - 1) setProfileStep(p => p + 1); else if (isInvited) handleRegister(); else { setPhase("workspace"); setWorkspaceStep(0); } }} />
                                </div>
                            </AnimatedStep>
                        )}

                        {phase === "workspace" && (
                            <AnimatedStep stepKey={`ws-${workspaceStep}`} direction={direction}>
                                <BackButton onClick={handleWorkspaceBack} />
                                {phaseLabel("Your workspace", workspaceStep + 1, WORKSPACE_STEPS.length)}

                                {globalError && (
                                    <div style={{ padding: "8px 12px", borderRadius: 10, background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.18)", color: "#dc2626", fontSize: 12, fontWeight: 500, marginBottom: 12 }}>{globalError}</div>
                                )}

                                {WORKSPACE_STEPS[workspaceStep] === "workspaceName" && (
                                    <>
                                        {stepHeading("Name your workspace", "This is the home for all your team's projects. You can rename it anytime.")}
                                        <FieldInput id="wsName" label="Workspace name" placeholder="e.g. Acme Projects" value={workspaceInfo.name} onChange={v => setWsField("name", v)} icon={Building2} error={errors.workspaceName} autoFocus onKeyDown={kEnter(handleWorkspaceNext)} />
                                    </>
                                )}

                                {WORKSPACE_STEPS[workspaceStep] === "workspaceType" && (
                                    <>
                                        {stepHeading("What kind of workspace?", "Pick the setup that best fits how you'll use this space.")}
                                        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                                            {WORKSPACE_TYPES.map(t => <SelectionCard key={t.id} selected={workspaceInfo.type === t.id} onClick={() => setWsField("type", t.id)} title={t.title} desc={t.desc} icon={t.icon} />)}
                                        </div>
                                    </>
                                )}

                                {WORKSPACE_STEPS[workspaceStep] === "workspaceTeamSize" && (
                                    <>
                                        {stepHeading("How big is your team?", "We'll optimise your workspace layout and features for your team's size.")}
                                        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                                            {TEAM_SIZES.map((s: any) => <SelectionCard key={s.id} selected={workspaceInfo.teamSize === s.id} onClick={() => setWsField("teamSize", s.id)} title={s.label} icon={s.icon} />)}
                                        </div>
                                    </>
                                )}

                                {WORKSPACE_STEPS[workspaceStep] === "workspaceIndustry" && (
                                    <>
                                        {stepHeading("What's your industry?", "Helps us pre-load the best workflow templates for your business sector.")}
                                        <FieldInput id="wsIndustry" label="Industry" placeholder="e.g. Technology, Finance, Healthcare" value={workspaceInfo.industry} onChange={v => setWsField("industry", v)} icon={Briefcase} error={errors.workspaceIndustry} autoFocus onKeyDown={kEnter(handleWorkspaceNext)} />
                                        <div style={{ marginTop: 10 }}><TipCard icon={Sparkles} text="Industry-specific templates save hours of setup — we've done the heavy lifting." /></div>
                                    </>
                                )}

                                {WORKSPACE_STEPS[workspaceStep] === "workspaceInviteMembers" && (
                                    <>
                                        {stepHeading("Bring your team along", "Invite colleagues now and start collaborating immediately.")}
                                        <div>
                                            <label htmlFor="wsInvites" style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--color-foreground)", opacity: 0.65, letterSpacing: "0.025em", marginBottom: 4 }}>Email addresses</label>
                                            <div style={{ position: "relative" }}>
                                                <Users className="h-3.5 w-3.5 absolute" style={{ left: 14, top: 12, color: "oklch(0.6 0 0)" }} />
                                                <textarea id="wsInvites" placeholder={"colleague@company.com\nanother@team.com"} rows={3} value={workspaceInfo.invitedMembers}
                                                    onChange={e => setWsField("invitedMembers", e.target.value)}
                                                    style={{ width: "100%", paddingLeft: 38, paddingRight: 12, paddingTop: 8, paddingBottom: 8, borderRadius: 10, fontSize: 13, fontWeight: 500, border: "1.5px solid var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)", outline: "none", resize: "none", fontFamily: "inherit", lineHeight: 1.5, boxSizing: "border-box", transition: "border-color 0.2s, box-shadow 0.2s" }}
                                                    onFocus={e => { e.target.style.borderColor = "var(--color-primary)"; e.target.style.boxShadow = "0 0 0 3px oklch(0.511 0.262 276.966 / 10%)"; }}
                                                    onBlur={e => { e.target.style.borderColor = "var(--color-border)"; e.target.style.boxShadow = "none"; }}
                                                />
                                            </div>
                                            <p style={{ fontSize: 10, color: "oklch(0.6 0 0)", marginTop: 4, paddingLeft: 2 }}>Separate multiple emails with commas or new lines</p>
                                        </div>
                                        <div style={{ marginTop: 10 }}><TipCard icon={Users} text="Teams that invite colleagues early see 4× faster project momentum. You're off to a great start." /></div>
                                    </>
                                )}

                                <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 3 }}>
                                    <ContinueButton onClick={handleWorkspaceNext} loading={loading}
                                        label={loading ? "Creating workspace" : workspaceStep === WORKSPACE_STEPS.length - 1 ? "Launch Workspace 🚀" : "Continue"} />
                                    {WORKSPACE_STEPS[workspaceStep] === "workspaceInviteMembers" && (
                                        <SkipButton onClick={() => { fw(); handleRegister(); }} />
                                    )}
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
