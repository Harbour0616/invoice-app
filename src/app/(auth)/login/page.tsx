"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              organization_name: organizationName || email,
            },
          },
        });
        if (error) throw error;
        // Supabaseの設定でメール確認を無効にしている場合はそのままログイン
        router.push("/invoices/new");
        router.refresh();
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push("/invoices/new");
        router.refresh();
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "エラーが発生しました"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md bg-card rounded-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-10">
        <h1 className="text-2xl font-bold text-center text-foreground mb-2">
          支払請求書登録
        </h1>
        <p className="text-sm text-sub-text text-center mb-8">
          {isSignUp ? "新規アカウント作成" : "ログイン"}
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {isSignUp && (
            <div>
              <label className="label">
                組織名
              </label>
              <input
                type="text"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                placeholder="例: 株式会社○○建設"
                className="input-bordered"
              />
            </div>
          )}

          <div>
            <label className="label">
              メールアドレス
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="email@example.com"
              className="input-bordered"
            />
          </div>

          <div>
            <label className="label">
              パスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="6文字以上"
              className="input-bordered"
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 px-4 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 cursor-pointer font-medium"
          >
            {loading
              ? "処理中..."
              : isSignUp
                ? "アカウント作成"
                : "ログイン"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError("");
            }}
            className="text-sm text-primary hover:underline cursor-pointer"
          >
            {isSignUp
              ? "すでにアカウントをお持ちの方はこちら"
              : "新規アカウント作成はこちら"}
          </button>
        </div>
      </div>
    </div>
  );
}
