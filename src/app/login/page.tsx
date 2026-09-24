import { LoginForm } from "./login-form";

export const metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh place-items-center px-4 pt-safe pb-safe">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/apple-icon" alt="" width={72} height={72} className="mx-auto rounded-[18px] shadow-lift" />
          <h1 className="title-large mt-5">Fuellness</h1>
          <p className="footnote mt-1 text-ink-2">Aprende algo cada día. Si no, hay consecuencias.</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
