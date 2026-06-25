import React, { useState, useMemo } from "react";
import {
    Stethoscope,
    ArrowRight,
    Loader2,
    Eye,
    EyeOff,
    Heart,
    Shield,
    Activity,
    Sparkles,
    Pill,
    Lock,
    Mail,
    User as UserIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import { getErrorMessage } from "../../../lib/api/error.utils";

interface AuthFormProps {
    onLogin: (email: string, password: string) => Promise<void>;
    onRegister: (payload: {
        firstname: string;
        lastname?: string;
        email: string;
        password: string;
        role?: "PATIENT" | "DOCTOR";
    }) => Promise<void>;
    initializing?: boolean;
}

type PasswordStrength = "weak" | "fair" | "good" | "strong";

function getPasswordStrength(password: string): PasswordStrength {
    if (password.length < 6) return "weak";

    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^a-zA-Z0-9]/.test(password);
    const hasMixedCase = hasLower && hasUpper;

    if (password.length >= 10 && hasMixedCase && hasNumber && hasSpecial) return "strong";
    if (password.length >= 8 && (hasMixedCase || hasNumber)) return "good";
    if (password.length >= 6) return "fair";

    return "weak";
}

const strengthConfig: Record<PasswordStrength, { label: string; colorClass: string; barClass: string }> = {
    weak: { label: "Weak", colorClass: "text-red-400", barClass: "strength-weak" },
    fair: { label: "Fair", colorClass: "text-amber-400", barClass: "strength-fair" },
    good: { label: "Good", colorClass: "text-emerald-400", barClass: "strength-good" },
    strong: { label: "Strong", colorClass: "text-emerald-500", barClass: "strength-strong" },
};

export const AuthForm: React.FC<AuthFormProps> = ({
    onLogin,
    onRegister,
    initializing,
}) => {
    const [mode, setMode] = useState<"login" | "register">("login");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !password.trim()) return;
        setIsLoading(true);

        try {
            if (mode === "login") {
                await onLogin(email.trim(), password);
            } else {
                const [firstname, ...lastnameParts] = name
                    ?.trim()
                    ?.split(/ /g) ?? [undefined, undefined];
                const lastname = lastnameParts?.join(" ").trim();
                if (!firstname?.length || !lastname?.length) {
                    toast.error("Firstname & lastname are both required!");
                    return;
                }
                await onRegister({
                    firstname,
                    lastname,
                    email: email.trim(),
                    password,
                    role: "PATIENT",
                });
            }
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, "Authentication failed"));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            {/* Animated background */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-100/60" />
            <div className="absolute inset-0 bg-grid opacity-50" />

            {/* Morphing gradient blob */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-brand-200/30 to-purple-200/20 blob animate-morph -translate-y-1/2 translate-x-1/4 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-purple-200/20 to-transparent rounded-full translate-y-1/3 -translate-x-1/4 blur-3xl pointer-events-none" />

            {/* Floating decorative medical icons */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
                <Heart className="absolute top-[12%] left-[8%] w-8 h-8 text-brand-200/30 animate-float-slow" style={{ animationDelay: "0s" }} />
                <Shield className="absolute top-[18%] right-[12%] w-10 h-10 text-purple-200/30 animate-drift" style={{ animationDelay: "2s" }} />
                <Activity className="absolute bottom-[22%] left-[14%] w-7 h-7 text-emerald-200/30 animate-drift" style={{ animationDelay: "4s" }} />
                <Sparkles className="absolute bottom-[30%] right-[10%] w-6 h-6 text-brand-200/30 animate-float-slow" style={{ animationDelay: "1s" }} />
                <Pill className="absolute top-[45%] left-[5%] w-9 h-9 text-purple-200/30 animate-float-slow" style={{ animationDelay: "3s" }} />
            </div>

            <div className="max-w-[420px] w-full relative z-10 animate-fade-in">
                {/* Card ambient glow */}
                <div className="absolute -inset-4 bg-gradient-to-br from-brand-400/15 via-purple-400/10 to-brand-300/15 rounded-[2rem] blur-2xl animate-breathe pointer-events-none" />

                {/* Card */}
                <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl shadow-soft-xl border border-white/60 p-8 animate-scale-in">
                    {/* Logo */}
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-gradient-to-br from-brand-600 via-brand-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-brand-500/25 animate-float">
                            <Stethoscope className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight gradient-text mb-1">
                            AI-Clinic
                        </h1>
                        <p className="text-sm text-gray-500">
                            {mode === "login"
                                ? "Welcome back! Sign in to continue."
                                : "Create your account to get started."}
                        </p>
                    </div>

                    {/* Mode tabs */}
                    <div className="flex bg-gray-100/80 rounded-xl p-1 mb-6">
                        <button
                            onClick={() => setMode("login")}
                            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-300 ${
                                mode === "login"
                                    ? "bg-white text-gray-900 shadow-sm shadow-glow-blue"
                                    : "text-gray-500 hover:text-gray-700"
                            }`}
                        >
                            Sign In
                        </button>
                        <button
                            onClick={() => setMode("register")}
                            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-300 ${
                                mode === "register"
                                    ? "bg-white text-gray-900 shadow-sm shadow-glow-blue"
                                    : "text-gray-500 hover:text-gray-700"
                            }`}
                        >
                            Register
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {mode === "register" && (
                            <div className="animate-slide-in-up">
                                <label htmlFor="name" className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                                    Full Name
                                </label>
                                <div className="relative">
                                    <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                    <input
                                        id="name"
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="John Doe"
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl input-focus text-sm"
                                        disabled={isLoading || initializing}
                                    />
                                </div>
                            </div>
                        )}

                        <div>
                            <label htmlFor="email" className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                                Email
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl input-focus text-sm"
                                    disabled={isLoading || initializing}
                                    autoComplete="email"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    className="w-full pl-10 pr-11 py-3 bg-gray-50/80 border border-gray-200 rounded-xl input-focus text-sm"
                                    disabled={isLoading || initializing}
                                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>

                            {/* Password strength indicator (register mode only) */}
                            {mode === "register" && password.length > 0 && (
                                <div className="mt-2 animate-slide-in-up">
                                    <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
                                        <div className={`strength-bar ${strengthConfig[passwordStrength].barClass}`} />
                                    </div>
                                    <p className={`text-xs mt-1 font-medium ${strengthConfig[passwordStrength].colorClass}`}>
                                        {strengthConfig[passwordStrength].label}
                                    </p>
                                </div>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || initializing}
                            className="w-full py-3.5 mt-2 btn-primary text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                        >
                            {isLoading || initializing ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Please wait...</>
                            ) : (
                                <>{mode === "login" ? "Sign In" : "Create Account"} <ArrowRight className="w-4 h-4" /></>
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-gray-400 mt-6">
                    AI-powered telemedicine platform
                </p>
            </div>
        </div>
    );
};
