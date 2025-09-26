import React, { useState } from "react";
import { MessageCircle } from "lucide-react";
import toast from "react-hot-toast";

interface AuthFormProps {
    onLogin: (email: string, password: string) => Promise<void>;
    onRegister: (payload: {
        firstname: string;
        lastname?: string;
        email: string;
        password: string;
        role: string;
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
                if (!firstname?.length || !lastnameParts?.length) {
                    toast.error("Firstname & lastname are both required!");
                }
                await onRegister({
                    firstname,
                    lastname: lastnameParts.join(" "),
                    email: email.trim(),
                    password,
                    role: "PATIENT",
                });
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="max-w-md w-full">
                <div className="bg-white rounded-3xl shadow-2xl p-8 hover-lift animate-slide-in-up backdrop-blur-sm border border-white/20">
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl hover-lift animate-float">
                            <MessageCircle className="w-10 h-10 text-white animate-pulse-slow" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            AI Chat Assistant
                        </h1>
                        <p className="text-gray-600 font-medium">
                            {mode === "login"
                                ? "Login to continue"
                                : "Create your account"}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {mode === "register" && (
                            <div>
                                <label
                                    htmlFor="name"
                                    className="block text-sm font-medium text-gray-700 mb-2"
                                >
                                    Name
                                </label>
                                <input
                                    id="name"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Your name"
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all-smooth shadow-sm hover:shadow-md"
                                    disabled={isLoading}
                                />
                            </div>
                        )}

                        <div>
                            <label
                                htmlFor="email"
                                className="block text-sm font-medium text-gray-700 mb-2"
                            >
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all-smooth shadow-sm hover:shadow-md"
                                disabled={isLoading}
                                autoComplete="email"
                                required
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="password"
                                className="block text-sm font-medium text-gray-700 mb-2"
                            >
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all-smooth shadow-sm hover:shadow-md"
                                disabled={isLoading}
                                autoComplete={
                                    mode === "login"
                                        ? "current-password"
                                        : "new-password"
                                }
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || initializing}
                            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-2xl transition-all-smooth hover:scale-105 disabled:hover:scale-100 shadow-lg hover:shadow-xl btn-press"
                        >
                            {isLoading || initializing
                                ? "🔄 Please wait..."
                                : mode === "login"
                                ? "🔐 Login"
                                : "📝 Register"}
                        </button>
                    </form>

                    <div className="mt-6 pt-6 border-t border-gray-200">
                        <button
                            onClick={() =>
                                setMode(mode === "login" ? "register" : "login")
                            }
                            className="w-full text-blue-600 hover:text-blue-700 font-bold py-2 transition-all-smooth hover-lift btn-press rounded-xl"
                        >
                            {mode === "login"
                                ? "Need an account? Register"
                                : "Have an account? Login"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
