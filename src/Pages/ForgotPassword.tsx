import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { API_BASE_URL } from "@/config";
import loginImg from "@/assets/login.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Lock, KeyRound, ArrowRight, ArrowLeft, ShieldAlert, CheckCircle2 } from "lucide-react";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // Timer for Resending OTP
  const [resendTimer, setResendTimer] = useState(0);

  // Form states
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Countdown effect for resend timer
  useEffect(() => {
    if (resendTimer > 0) {
      const interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [resendTimer]);

  // Step 1: Send OTP
  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to request code");
      }

      setSuccess("We have sent a 6-digit verification code to your email.");
      setStep(2);
      setResendTimer(60); // Start 60-second cooldown
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (otpCode.length !== 6) {
      setError("Please enter the 6-digit verification code.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          code: otpCode.trim()
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Verification failed");
      }

      setResetToken(data.resetToken);
      setSuccess("Verification successful! Please choose a new password.");
      setStep(3);
    } catch (err: any) {
      setError(err.message || "Invalid or expired verification code.");
    } finally {
      setLoading(false);
    }
  };

  // Handle resend OTP click
  const handleResendOTP = async () => {
    if (resendTimer > 0) return;
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to resend code");
      }

      setSuccess("A new 6-digit verification code has been sent to your email.");
      setOtpCode(""); // Reset input code
      setResendTimer(60); // Reset countdown timer
    } catch (err: any) {
      setError(err.message || "Could not resend code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          resetToken,
          password
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to reset password");
      }

      setStep(4);
    } catch (err: any) {
      setError(err.message || "Failed to update your password. Please try starting over.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/50 flex items-center justify-center p-4 sm:p-6 transition-colors lg:overflow-hidden">
      <div className="w-full max-w-5xl grid lg:grid-cols-2 bg-card text-card-foreground rounded-3xl shadow-xl border border-border/60 overflow-hidden lg:h-[min(620px,90vh)]">

        {/* Left Side Branding Image */}
        <div className="relative hidden lg:block p-3 bg-background h-full">
          <img
            src={loginImg}
            alt="Security Visual"
            className="h-full w-full object-cover rounded-2xl border border-border/40 shadow-xs"
          />
        </div>

        {/* Right Side Cards */}
        <div className="flex flex-col justify-center p-6 sm:p-10 lg:p-8 h-full overflow-y-auto">
          <div className="w-full max-w-md mx-auto">

            {/* STEP 1: Enter Email */}
            {step === 1 && (
              <>
                <div className="space-y-2 pb-4 text-left">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 border border-indigo-150 flex items-center justify-center text-primary mb-1">
                    <KeyRound className="h-4.5 w-4.5" />
                  </div>
                  <h2 className="text-2xl font-black tracking-tight text-foreground">
                    Forgot Password
                  </h2>
                  <p className="text-zinc-450 text-[11px] leading-snug">
                    Enter your email address, and we will send you a 6-digit OTP code to verify your identity.
                  </p>
                </div>

                <div>
                  <form onSubmit={handleRequestOTP} className="space-y-3">
                    {error && (
                      <div className="p-2.5 bg-red-50 border border-red-200 text-red-650 rounded-xl text-xs font-semibold flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 shrink-0 text-red-500" />
                        <span>{error}</span>
                      </div>
                    )}

                    <div className="space-y-1">
                      <Label htmlFor="email" className="text-xs font-bold text-foreground/90">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="you@company.com"
                          className="h-9.5 pl-10 rounded-xl border-border text-xs focus-visible:ring-ring font-medium"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-9.5 rounded-xl text-xs font-bold mt-1 bg-primary hover:bg-primary/90 text-white cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                      disabled={loading}
                    >
                      {loading ? "Sending Code..." : "Send Verification Code"}
                      {!loading && <ArrowRight className="h-4.5 w-4.5" />}
                    </Button>

                    <Link
                      to="/login"
                      className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-zinc-450 hover:text-muted-foreground pt-1.5 cursor-pointer transition-colors"
                    >
                      <ArrowLeft className="h-4.5 w-4.5" />
                      Back to Account Login
                    </Link>
                  </form>
                </div>
              </>
            )}

            {/* STEP 2: Verify OTP */}
            {step === 2 && (
              <>
                <div className="space-y-2 pb-4 text-left">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 border border-indigo-150 flex items-center justify-center text-primary mb-1">
                    <KeyRound className="h-4.5 w-4.5" />
                  </div>
                  <h2 className="text-xl font-black tracking-tight text-foreground">
                    Verify Code
                  </h2>
                  <p className="text-zinc-450 text-[11px] leading-snug">
                    Please enter the 6-digit verification code sent to <span className="font-bold text-foreground/90">{email}</span>. Code is valid for 5 minutes.
                  </p>
                </div>

                <div>
                  <form onSubmit={handleVerifyOTP} className="space-y-3">
                    {success && (
                      <div className="p-2.5 bg-emerald-50 border border-emerald-250 text-emerald-700 rounded-xl text-xs font-semibold">
                        {success}
                      </div>
                    )}
                    {error && (
                      <div className="p-2.5 bg-red-50 border border-red-200 text-red-650 rounded-xl text-xs font-semibold flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 shrink-0 text-red-500" />
                        <span>{error}</span>
                      </div>
                    )}

                    <div className="space-y-1">
                      <Label htmlFor="otpCode" className="text-xs font-bold text-foreground/90">Verification Code</Label>
                      <Input
                        id="otpCode"
                        type="text"
                        placeholder="••••••"
                        maxLength={6}
                        className="h-9.5 rounded-xl border-border text-xs font-bold focus-visible:ring-ring text-center tracking-[0.35em]"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                        required
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-9.5 rounded-xl text-xs font-bold mt-1 bg-primary hover:bg-primary/90 text-white cursor-pointer shadow-xs flex items-center justify-center"
                      disabled={loading}
                    >
                      {loading ? "Verifying..." : "Verify Code"}
                    </Button>

                    <div className="text-center pt-1.5">
                      {resendTimer > 0 ? (
                        <p className="text-xs text-zinc-450 font-semibold">
                          Resend code in <span className="text-primary font-bold">{resendTimer}s</span>
                        </p>
                      ) : (
                        <button
                          type="button"
                          className="text-xs font-bold text-primary hover:text-primary hover:underline cursor-pointer transition-colors"
                          onClick={handleResendOTP}
                          disabled={loading}
                        >
                          Resend Verification Code
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-zinc-450 hover:text-muted-foreground pt-1.5 cursor-pointer transition-colors"
                      onClick={() => {
                        setStep(1);
                        setError("");
                        setSuccess("");
                        setOtpCode("");
                      }}
                    >
                      <ArrowLeft className="h-4.5 w-4.5" />
                      Back to Email Input
                    </button>
                  </form>
                </div>
              </>
            )}

            {/* STEP 3: Reset Password */}
            {step === 3 && (
              <>
                <div className="space-y-2 pb-4 text-left">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 border border-indigo-150 flex items-center justify-center text-primary mb-1">
                    <Lock className="h-4.5 w-4.5" />
                  </div>
                  <h2 className="text-xl font-black tracking-tight text-foreground">
                    Set New Password
                  </h2>
                  <p className="text-zinc-450 text-[11px] leading-snug">
                    Please secure your account by entering a new password. It must be at least 6 characters long.
                  </p>
                </div>

                <div>
                  <form onSubmit={handleResetPassword} className="space-y-3">
                    {error && (
                      <div className="p-2.5 bg-red-50 border border-red-200 text-red-650 rounded-xl text-xs font-semibold flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 shrink-0 text-red-500" />
                        <span>{error}</span>
                      </div>
                    )}

                    <div className="space-y-1">
                      <Label htmlFor="password" className="text-xs font-bold text-foreground/90">New Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="password"
                          type="password"
                          placeholder="Enter new password"
                          className="h-9.5 pl-10 rounded-xl border-border text-xs focus-visible:ring-ring font-medium"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="confirmPassword" className="text-xs font-bold text-foreground/90">Confirm New Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="confirmPassword"
                          type="password"
                          placeholder="Re-enter new password"
                          className="h-9.5 pl-10 rounded-xl border-border text-xs focus-visible:ring-ring font-medium"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-9.5 rounded-xl text-xs font-bold mt-1 bg-primary hover:bg-primary/90 text-white cursor-pointer shadow-xs flex items-center justify-center"
                      disabled={loading}
                    >
                      {loading ? "Updating Password..." : "Update Password"}
                    </Button>
                  </form>
                </div>
              </>
            )}

            {/* STEP 4: Success Screen */}
            {step === 4 && (
              <>
                <div className="space-y-2 pb-4 text-center flex flex-col items-center">
                  <div className="w-11 h-11 rounded-full bg-emerald-50 border border-emerald-250 flex items-center justify-center text-emerald-600 mb-1 animate-bounce">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <h2 className="text-xl font-black tracking-tight text-foreground">
                    Password Reset!
                  </h2>
                  <p className="text-zinc-450 text-[11px] text-center leading-snug">
                    Your password has been successfully updated. You can now use your new password to sign in.
                  </p>
                </div>

                <div>
                  <Button
                     onClick={() => navigate("/login")}
                     className="w-full h-9.5 rounded-xl text-xs font-bold mt-1 bg-primary hover:bg-primary/90 text-white cursor-pointer shadow-xs"
                  >
                    Go to Log In
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
