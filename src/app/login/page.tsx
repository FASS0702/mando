export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0f0f14] text-zinc-200">
      <form method="post" action="/api/login" className="w-80 rounded-xl border border-zinc-800 bg-[#16161d] p-6 flex flex-col gap-4">
        <div>
          <div className="text-lg font-semibold text-white">MANDO</div>
          <div className="text-xs text-zinc-500">Central de Operaciones</div>
        </div>
        <input type="hidden" name="next" value={next ?? "/"} />
        <label className="text-sm text-zinc-400" htmlFor="password">Contraseña</label>
        <input
          id="password"
          name="password"
          type="password"
          autoFocus
          className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-violet-500"
        />
        {error && <div className="text-xs text-red-400">Contraseña incorrecta.</div>}
        <button type="submit" className="rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500">
          Entrar
        </button>
      </form>
    </main>
  );
}
