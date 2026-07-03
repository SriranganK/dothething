import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useConfirm } from "@/context/ConfirmContext";
import { Mail, Lock, KeyRound, Globe, ArrowRight, ArrowLeft, ShieldAlert, Eye, EyeOff } from "lucide-react";

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const confirm = useConfirm();

  const from = (location.state as any)?.from || "/";

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState({
    email: "",
    password: "",
  });

  // SSO & MFA states
  const [ssoRequired, setSsoRequired] = useState(false);
  const [showMFA, setShowMFA] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [tempToken, setTempToken] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, name: string) => {
    const { value } = e.target;
    setUserInfo((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckSSO = async (email: string) => {
    if (!email || !email.includes("@")) {
      setSsoRequired(false);
      return;
    }
    try {
      const res = await fetch(`http://localhost:5000/api/auth/check-sso?email=${email.trim()}`);
      if (res.ok) {
        const data = await res.json();
        setSsoRequired(data.ssoRequired);
      } else {
        setSsoRequired(false);
      }
    } catch (err) {
      console.error("SSO check failed:", err);
      setSsoRequired(false);
    }
  };

  useEffect(() => {
    const trimmedEmail = userInfo.email.trim();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setSsoRequired(false);
      return;
    }

    // Only trigger check when email seems to have a domain part, e.g., user@domain
    const parts = trimmedEmail.split("@");
    if (parts.length < 2 || parts[1].length < 2) {
      return;
    }

    const timer = setTimeout(() => {
      handleCheckSSO(trimmedEmail);
    }, 400);

    return () => clearTimeout(timer);
  }, [userInfo.email]);

  const handleLogin = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userInfo.email.trim(),
          password: userInfo.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      if (data.mfaRequired) {
        setTempToken(data.tempToken);
        setShowMFA(true);
        setLoading(false);
        return;
      }

      login(data.token, data.user);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSSOLogin = async (e: React.MouseEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/auth/sso-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userInfo.email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "SSO Login failed");
      login(data.token, data.user);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async (e: React.MouseEvent) => {
    e.preventDefault();
    setError("");
    const email = await confirm({
      title: "Google SSO Sign-In",
      description: "Enter your Google SSO Email to proceed:",
      confirmText: "Sign In",
      isPrompt: true,
      promptDefaultValue: userInfo.email || "user@company.com",
      promptPlaceholder: "user@company.com",
    });
    if (!email || typeof email !== 'string') return;
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/auth/sso-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), name: email.split('@')[0] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "SSO Sign-in failed");
      login(data.token, data.user);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMFA = async (e: React.MouseEvent) => {
    e.preventDefault();
    setError("");
    if (mfaCode.length < 6) {
      setError("Please enter a valid 6-digit code.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/auth/verify-mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tempToken, code: mfaCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Verification code is invalid");
      login(data.token, data.user);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/50 flex items-center justify-center p-4 sm:p-6 transition-colors">
      <div className="w-full max-w-5xl grid lg:grid-cols-2 bg-card text-card-foreground rounded-3xl shadow-xl border border-border/60 overflow-hidden">

        {/* Left Side Branding Image */}
        <div className="relative hidden lg:block p-3.5 bg-background">
          <img
            src="/src/assets/login.png"
            alt="Login Visual"
            className="h-full w-full object-cover rounded-2xl border border-border/40 shadow-xs"
          />
        </div>

        {/* Right Side Card Forms */}
        <div className="flex items-center justify-center p-6 sm:p-10 lg:p-14">
          <Card className="w-full max-w-md p-4 border-0 shadow-none bg-transparent">

            {/* MFA VIEW SCREEN */}
            {showMFA ? (
              <>
                <CardHeader className="space-y-3 px-0 pb-6 text-left">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-indigo-150 flex items-center justify-center text-primary mb-1 animate-pulse">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-2xl font-black tracking-tight text-foreground">
                    Two-Factor Verification
                  </CardTitle>
                  <CardDescription className="text-zinc-450 text-xs">
                    Multi-factor login is enforced for this account. Enter the 6-digit verification code below.
                  </CardDescription>
                </CardHeader>

                <CardContent className="px-0">
                  <form className="space-y-4">
                    {error && (
                      <div className="p-3 bg-red-50 border border-red-200 text-red-650 rounded-xl text-xs font-semibold flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 shrink-0 text-red-500" />
                        <span>{error}</span>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <Label htmlFor="mfaCode" className="text-xs font-bold text-foreground/90">Verification Code</Label>
                      <Input
                        id="mfaCode"
                        type="text"
                        placeholder="Enter 6-digit code (e.g. 123456)"
                        maxLength={6}
                        className="h-10.5 rounded-xl border-border text-xs font-semibold focus-visible:ring-ring text-center tracking-[0.25em]"
                        value={mfaCode}
                        onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
                        required
                      />
                      <p className="text-[10px] text-muted-foreground font-semibold mt-1">For demo purposes, enter <code className="text-primary font-bold bg-background px-1 py-0.5 rounded">123456</code> to verify.</p>
                    </div>

                    <Button
                      className="w-full h-10.5 rounded-xl text-xs font-bold mt-2 bg-primary hover:bg-primary/90 text-white cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                      onClick={handleVerifyMFA}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        "Verify & Log In"
                      )}
                    </Button>

                    <button
                      type="button"
                      className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-zinc-450 hover:text-muted-foreground pt-2 cursor-pointer transition-colors"
                      onClick={() => {
                        setShowMFA(false);
                        setMfaCode("");
                        setError("");
                      }}
                    >
                      <ArrowLeft className="h-4.5 w-4.5" />
                      Back to Account Login
                    </button>
                  </form>
                </CardContent>
              </>
            ) : (
              /* REGULAR ACCOUNT LOGIN SCREEN */
              <>
                <CardHeader className="space-y-3 px-0 pb-6 text-left">
                  <CardTitle className="text-3xl font-black tracking-tight text-foreground">
                    Welcome Back
                  </CardTitle>
                  <CardDescription className="text-zinc-450 text-xs">
                    Log in to collaborate on task boards and milestones
                  </CardDescription>
                </CardHeader>

                <CardContent className="px-0">
                  <form className="space-y-4">
                    {error && (
                      <div className="p-3 bg-red-50 border border-red-200 text-red-650 rounded-xl text-xs font-semibold flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 shrink-0 text-red-500" />
                        <span>{error}</span>
                      </div>
                    )}

                    {/* Email Input */}
                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-xs font-bold text-foreground/90">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="you@company.com"
                          className="h-10.5 pl-10 rounded-xl border-border text-xs focus-visible:ring-ring font-medium"
                          value={userInfo.email}
                          onChange={(e) => handleChange(e, "email")}
                          onBlur={(e) => handleCheckSSO(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    {/* Password Input (Hidden if SSO is required) */}
                    {!ssoRequired && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="password" className="text-xs font-bold text-foreground/90">Password</Label>
                          <Link to="/forgot-password" className="text-xs font-bold text-indigo-605 hover:underline">
                            Forgot?
                          </Link>
                        </div>
                         <div className="relative">
                           <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                           <Input
                             id="password"
                             type={showPassword ? "text" : "password"}
                             placeholder="Enter account password"
                             className="h-10.5 pl-10 pr-10 rounded-xl border-border text-xs focus-visible:ring-ring font-medium"
                             value={userInfo.password}
                             onChange={(e) => handleChange(e, "password")}
                             required
                           />
                           <button
                             type="button"
                             onClick={() => setShowPassword(!showPassword)}
                             className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer focus:outline-hidden"
                           >
                             {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                           </button>
                         </div>
                      </div>
                    )}

                    {/* SSO Redirection indicator */}
                    {ssoRequired && (
                      <div className="p-3.5 bg-primary/10/50 border border-primary/25/40 rounded-xl text-xs text-primary font-semibold leading-relaxed">
                        Single Sign-On (SSO) is enforced for this email domain. You will authenticate via your identity provider.
                      </div>
                    )}

                    {/* Login Action buttons */}
                    {ssoRequired ? (
                      <Button
                        className="w-full h-10.5 rounded-xl text-xs font-bold mt-2 bg-primary hover:bg-primary/90 text-white cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                        onClick={handleSSOLogin}
                        disabled={loading}
                      >
                        {loading ? "Authenticating SSO..." : "Continue with SSO"}
                        <ArrowRight className="h-4.5 w-4.5" />
                      </Button>
                    ) : (
                      <Button
                        className="w-full h-10.5 rounded-xl text-xs font-bold mt-2 bg-primary hover:bg-primary/90 text-white cursor-pointer shadow-xs"
                        onClick={handleLogin}
                        disabled={loading}
                      >
                        {loading ? "Logging in..." : "Log In"}
                      </Button>
                    )}

                    {/* Divider */}
                    <div className="relative flex py-2 items-center">
                      <div className="flex-grow border-t border-border"></div>
                      <span className="flex-shrink mx-3 text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Or</span>
                      <div className="flex-grow border-t border-border"></div>
                    </div>

                    {/* Google OAuth Login Button */}
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-10.5 rounded-xl text-xs font-bold border-border flex items-center justify-center gap-2 cursor-pointer hover:bg-background"
                      onClick={handleGoogleLogin}
                      disabled={loading}
                    >
                      <Globe className="h-4 w-4 text-rose-500" />
                      Continue with Google SSO
                    </Button>

                    <p className="text-center text-xs text-zinc-550 pt-2">
                      Don&apos;t have an account?{" "}
                      <a href="/register" className="font-bold text-primary hover:underline">
                        Register here
                      </a>
                    </p>
                  </form>
                </CardContent>
              </>
            )}

          </Card>
        </div>

      </div>
    </div>
  );
}