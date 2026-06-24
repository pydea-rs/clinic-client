import React, { useState } from "react";
import { Stethoscope, ArrowRight, Loader2, Eye, EyeOff } from "lucide-react";
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
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-brand-200/30 to-transparent rounded-full -translate-y-1/2 translate-x-1/4 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-purple-200/20 to-transparent rounded-full translate-y-1/3 -translate-x-1/4 blur-3xl" />

            <div className="max-w-[420px] w-full relative z-10 animate-fade-in">
                {/* Card */}
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-soft-xl border border-white/60 p-8 animate-scale-in">
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
                                    ? "bg-white text-gray-900 shadow-sm"
                                    : "text-gray-500 hover:text-gray-700"
                            }`}
                        >
                            Sign In
                        </button>
                        <button
                            onClick={() => setMode("register")}
                            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-300 ${
                                mode === "register"
                                    ? "bg-white text-gray-900 shadow-sm"
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
                                <input
                                    id="name"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="John Doe"
                                    className="w-full px-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl input-focus text-sm"
                                    disabled={isLoading || initializing}
                                />
                            </div>
                        )}

                        <div>
                            <label htmlFor="email" className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                className="w-full px-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl input-focus text-sm"
                                disabled={isLoading || initializing}
                                autoComplete="email"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    className="w-full px-4 py-3 pr-11 bg-gray-50/80 border border-gray-200 rounded-xl input-focus text-sm"
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
