export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center font-sans">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-center py-32 px-16 text-center gap-6">
        <h1 className="text-4xl font-bold tracking-tight">VoltDispatch</h1>
        <p className="text-lg text-muted-foreground max-w-md">
          Technician Management System — EV charger field service operations
        </p>
      </main>
    </div>
  );
}
