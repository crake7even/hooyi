import React, { useState } from "react";
import { LogIn, Mail, X } from "lucide-react";
import { isSupabaseConfigured, supabase } from "../api/supabaseClient";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage("");

    if (!supabase) {
      setMessage("Supabase 还没有配置，先在 .env.local 添加 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY。");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

      if (result.error) {
        setMessage(result.error.message);
        return;
      }

      if (mode === "signup" && !result.data.session) {
        setMessage("注册成功，请先去邮箱确认账号。");
        return;
      }

      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-neutral-950/80 p-4 backdrop-blur-xl">
      <div className="relative w-full max-w-md rounded-[28px] border border-white/10 bg-neutral-950/95 p-5 shadow-2xl text-left">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-white/55 transition-colors hover:text-white"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <div className="mb-6 pr-10">
          <p className="text-[10px] font-black uppercase tracking-widest text-brand-coral">
            Account
          </p>
          <h2 className="mt-2 text-2xl font-serif font-extrabold text-white">
            {mode === "signin" ? "登录好影" : "创建账号"}
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-white/45">
            登录后会保存待看清单、浏览记录和随心一刷偏好。
          </p>
        </div>

        {!isSupabaseConfigured && (
          <div className="mb-4 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-xs leading-relaxed text-amber-50/80">
            Supabase 环境变量未配置，账号功能暂时不会连接云端。
          </div>
        )}

        <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-1.5 text-xs font-bold text-white/60">
            Email
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3">
              <Mail size={15} className="text-white/35" />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-11 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/25"
                placeholder="you@example.com"
                required
              />
            </div>
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-bold text-white/60">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-11 rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white outline-none placeholder:text-white/25"
              placeholder="至少 6 位"
              minLength={6}
              required
            />
          </label>

          {message && (
            <p className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs leading-relaxed text-white/65">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 flex h-11 items-center justify-center gap-2 rounded-2xl bg-brand-coral text-sm font-black text-neutral-950 transition-all hover:bg-orange-400 disabled:cursor-wait disabled:opacity-60"
          >
            <LogIn size={16} />
            {isSubmitting ? "处理中" : mode === "signin" ? "登录" : "注册"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMessage("");
            setMode((current) => current === "signin" ? "signup" : "signin");
          }}
          className="mt-4 w-full text-center text-xs font-bold text-white/45 transition-colors hover:text-white"
        >
          {mode === "signin" ? "还没有账号？去注册" : "已有账号？去登录"}
        </button>
      </div>
    </div>
  );
}
