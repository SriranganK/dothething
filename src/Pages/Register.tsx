import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Mail, Lock, Briefcase, Building2, MapPin, ArrowRight, ArrowLeft, ShieldAlert } from "lucide-react";

export default function Register() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // Form inputs state
    const [userInfo, setUserInfo] = useState({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        designation: "",
        company: "",
        department: "",
        location: "",
        timezone: "GMT+5:30 (IST)"
    });

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            navigate("/");
        }
    }, [navigate]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
        const { value } = e.target;
        setUserInfo((prev) => ({
            ...prev,
            [fieldName]: value
        }));
    };

    const handleSelectChange = (value: string, fieldName: string) => {
        setUserInfo((prev) => ({
            ...prev,
            [fieldName]: value
        }));
    };

    const validateStep1 = () => {
        setError("");
        if (!userInfo.name.trim()) {
            setError("Please enter your full name.");
            return false;
        }
        if (!userInfo.email.trim() || !userInfo.email.includes("@")) {
            setError("Please enter a valid email address.");
            return false;
        }
        if (userInfo.password.length < 6) {
            setError("Password must be at least 6 characters long.");
            return false;
        }
        if (userInfo.password !== userInfo.confirmPassword) {
            setError("Passwords do not match.");
            return false;
        }
        return true;
    };

    const handleNext = (e: React.MouseEvent) => {
        e.preventDefault();
        if (validateStep1()) {
            setStep(2);
        }
    };

    const handleRegister = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const response = await fetch("http://localhost:5000/api/auth/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: userInfo.name.trim(),
                    email: userInfo.email.trim().toLowerCase(),
                    password: userInfo.password,
                    designation: userInfo.designation.trim(),
                    company: userInfo.company.trim(),
                    department: userInfo.department.trim(),
                    location: userInfo.location.trim(),
                    timezone: userInfo.timezone
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Registration failed");
            }

            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));
            navigate("/");
        } catch (err: any) {
            setError(err.message || "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-muted/50 flex items-center justify-center p-4 sm:p-6 transition-colors">
            <div className="w-full max-w-5xl grid lg:grid-cols-2 bg-card text-card-foreground rounded-3xl shadow-xl border border-border/60 overflow-hidden">

                {/* Left Side Image */}
                <div className="relative hidden lg:block p-3.5 bg-background dark:bg-zinc-900">
                    <img
                        src="/src/assets/login.png"
                        alt="Login Visual"
                        className="h-full w-full object-cover rounded-2xl border border-border/40 dark:border-border/40 shadow-xs"
                    />
                </div>

                {/* Right Side Register steps */}
                <div className="flex items-center justify-center p-6 sm:p-10 lg:p-14">
                    <Card className="w-full max-w-md p-4 border-0 shadow-none bg-transparent">

                        <CardHeader className="space-y-3 px-0 pb-6 text-left">
                            <CardTitle className="text-2xl font-black tracking-tight text-foreground">
                                {step === 1 ? "Create Account" : "Setup Professional Profile"}
                            </CardTitle>
                            <CardDescription className="text-zinc-400 text-xs">
                                {step === 1 
                                    ? "Start by entering your workspace account credentials" 
                                    : "Help your team members recognize you in the workspace details"
                                }
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

                                {/* STEP 1: Basic credentials */}
                                {step === 1 && (
                                    <div className="space-y-4">
                                        {/* Full Name */}
                                        <div className="space-y-1.5">
                                            <Label htmlFor="name" className="text-xs font-bold text-foreground/90">Full Name</Label>
                                            <div className="relative">
                                                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    id="name"
                                                    type="text"
                                                    placeholder="e.g. John Doe"
                                                    className="h-10.5 pl-10 rounded-xl border-border text-xs focus-visible:ring-ring font-medium"
                                                    required
                                                    value={userInfo.name}
                                                    onChange={(e) => handleChange(e, "name")}
                                                />
                                            </div>
                                        </div>

                                        {/* Email Address */}
                                        <div className="space-y-1.5">
                                            <Label htmlFor="email" className="text-xs font-bold text-foreground/90">Email Address</Label>
                                            <div className="relative">
                                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    id="email"
                                                    type="email"
                                                    placeholder="you@company.com"
                                                    className="h-10.5 pl-10 rounded-xl border-border text-xs focus-visible:ring-ring font-medium"
                                                    required
                                                    value={userInfo.email}
                                                    onChange={(e) => handleChange(e, "email")}
                                                />
                                            </div>
                                        </div>

                                        {/* Passwords */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label htmlFor="password" className="text-xs font-bold text-foreground/90">Password</Label>
                                                <div className="relative">
                                                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        id="password"
                                                        type="password"
                                                        placeholder="Min. 6 chars"
                                                        className="h-10.5 pl-10 rounded-xl border-border text-xs focus-visible:ring-ring font-medium"
                                                        required
                                                        value={userInfo.password}
                                                        onChange={(e) => handleChange(e, "password")}
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-1.5">
                                                <Label htmlFor="confirmPassword" className="text-xs font-bold text-foreground/90">Confirm Password</Label>
                                                <div className="relative">
                                                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        id="confirmPassword"
                                                        type="password"
                                                        placeholder="Repeat password"
                                                        className="h-10.5 pl-10 rounded-xl border-border text-xs focus-visible:ring-ring font-medium"
                                                        required
                                                        value={userInfo.confirmPassword}
                                                        onChange={(e) => handleChange(e, "confirmPassword")}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <Button
                                            className="w-full h-10.5 rounded-xl text-xs font-bold mt-2 cursor-pointer bg-primary hover:bg-primary/90 text-white flex items-center justify-center gap-1 shadow-sm"
                                            onClick={handleNext}
                                        >
                                            Continue Setup
                                            <ArrowRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}

                                {/* STEP 2: Optional professional details */}
                                {step === 2 && (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {/* Designation */}
                                            <div className="space-y-1.5">
                                                <Label htmlFor="designation" className="text-xs font-bold text-foreground/90">Designation / Role</Label>
                                                <div className="relative">
                                                    <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        id="designation"
                                                        type="text"
                                                        placeholder="e.g. Lead Engineer"
                                                        className="h-10.5 pl-10 rounded-xl border-border text-xs focus-visible:ring-ring font-medium"
                                                        value={userInfo.designation}
                                                        onChange={(e) => handleChange(e, "designation")}
                                                    />
                                                </div>
                                            </div>

                                            {/* Company */}
                                            <div className="space-y-1.5">
                                                <Label htmlFor="company" className="text-xs font-bold text-foreground/90">Company Name</Label>
                                                <div className="relative">
                                                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        id="company"
                                                        type="text"
                                                        placeholder="e.g. Stripe Inc"
                                                        className="h-10.5 pl-10 rounded-xl border-border text-xs focus-visible:ring-ring font-medium"
                                                        value={userInfo.company}
                                                        onChange={(e) => handleChange(e, "company")}
                                                    />
                                                </div>
                                            </div>

                                            {/* Department */}
                                            <div className="space-y-1.5">
                                                <Label htmlFor="department" className="text-xs font-bold text-foreground/90">Department</Label>
                                                <Input
                                                    id="department"
                                                    type="text"
                                                    placeholder="e.g. Product Engineering"
                                                    className="h-10.5 rounded-xl border-border text-xs focus-visible:ring-ring font-medium"
                                                    value={userInfo.department}
                                                    onChange={(e) => handleChange(e, "department")}
                                                />
                                            </div>

                                            {/* Location */}
                                            <div className="space-y-1.5">
                                                <Label htmlFor="location" className="text-xs font-bold text-foreground/90">Office Location</Label>
                                                <div className="relative">
                                                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        id="location"
                                                        type="text"
                                                        placeholder="e.g. San Francisco, CA"
                                                        className="h-10.5 pl-10 rounded-xl border-border text-xs focus-visible:ring-ring font-medium"
                                                        value={userInfo.location}
                                                        onChange={(e) => handleChange(e, "location")}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Timezone */}
                                        <div className="space-y-1.5">
                                            <Label htmlFor="timezone" className="text-xs font-bold text-foreground/90">Office Timezone</Label>
                                            <Select
                                                value={userInfo.timezone}
                                                onValueChange={(val) => handleSelectChange(val, "timezone")}
                                            >
                                                <SelectTrigger className="h-10.5 rounded-xl border-border text-xs font-medium">
                                                    <SelectValue placeholder="Select office timezone" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="GMT-8 (Pacific Time)">GMT-8 (Pacific Time)</SelectItem>
                                                    <SelectItem value="GMT-5 (Eastern Time)">GMT-5 (Eastern Time)</SelectItem>
                                                    <SelectItem value="GMT+0 (Greenwich Time)">GMT+0 (Greenwich Time)</SelectItem>
                                                    <SelectItem value="GMT+1 (Central European)">GMT+1 (Central European)</SelectItem>
                                                    <SelectItem value="GMT+5:30 (IST)">GMT+5:30 (IST)</SelectItem>
                                                    <SelectItem value="GMT+8 (Singapore Time)">GMT+8 (Singapore Time)</SelectItem>
                                                    <SelectItem value="GMT+10 (Australian Eastern)">GMT+10 (Australian Eastern)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="flex gap-3 pt-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="flex-1 h-10.5 rounded-xl text-xs font-bold border-border flex items-center justify-center gap-1.5"
                                                onClick={() => setStep(1)}
                                            >
                                                <ArrowLeft className="h-4 w-4" />
                                                Back
                                            </Button>
                                            <Button
                                                className="flex-[2] h-10.5 rounded-xl text-xs font-bold cursor-pointer bg-primary hover:bg-primary/90 text-white flex items-center justify-center gap-1 shadow-sm"
                                                onClick={handleRegister}
                                                disabled={loading}
                                            >
                                                {loading ? (
                                                    <>
                                                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                        Creating Account...
                                                    </>
                                                ) : (
                                                    "Complete Registration"
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* Bottom switch prompt */}
                                <p className="text-center text-xs text-zinc-500 pt-2">
                                    Already have an account?{" "}
                                    <a href="/login" className="font-bold text-primary hover:underline">
                                        Login here
                                    </a>
                                </p>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}