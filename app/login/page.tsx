import { loginAction } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <form
        action={loginAction}
        className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-slate-200 p-8 space-y-5"
      >
        <div>
          <h1 className="text-2xl font-semibold text-brand">Kingsgate</h1>
          <p className="text-sm text-slate-500 mt-1">
            CEO dashboard — agency staff sign in
          </p>
        </div>

        <div className="space-y-3">
          <label className="block text-sm">
            <span className="text-slate-700">Email</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-accent focus:outline-none"
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-700">Password</span>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-accent focus:outline-none"
            />
          </label>
        </div>

        {params.error && (
          <p className="text-sm text-severity-high">{params.error}</p>
        )}

        <button
          type="submit"
          className="w-full rounded-md bg-brand text-white text-sm font-medium py-2.5 hover:bg-slate-800"
        >
          Sign in
        </button>
      </form>
    </main>
  );
}
