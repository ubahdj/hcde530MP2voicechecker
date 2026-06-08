import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — VoiceCheck" },
      { name: "description", content: "Sign in to VoiceCheck to review qualitative findings for participant voice." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/app", replace: true });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin + "/app" },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account, then sign in.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/app", replace: true });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/app",
    });
    if (result.error) {
      toast.error(result.error.message ?? "Google sign-in failed");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-6 py-5 border-b border-border">
        <Link to="/" className="font-display text-xl tracking-tight">VoiceCheck</Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <h1 className="font-display text-3xl mb-2">{mode === "signin" ? "Welcome back" : "Create your account"}</h1>
          <p className="text-muted-foreground mb-8 text-sm">
            {mode === "signin" ? "Sign in to review your evaluation drafts." : "Start protecting participant voice in your reports."}
          </p>

          <Button onClick={handleGoogle} disabled={loading} variant="outline" className="w-full mb-4 h-11">
            Continue with Google
          </Button>

          <div className="relative my-6 text-center text-xs text-muted-foreground">
            <span className="bg-background px-3 relative z-10">or with email</span>
            <div className="absolute inset-x-0 top-1/2 border-t border-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 h-11" autoComplete="email" />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5 h-11" autoComplete={mode === "signin" ? "current-password" : "new-password"} />
            </div>
            <Button type="submit" disabled={loading} className="w-full h-11">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <p className="text-sm text-muted-foreground text-center mt-6">
            {mode === "signin" ? "New here?" : "Have an account?"}{" "}
            <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="text-foreground underline underline-offset-4">
              {mode === "signin" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}