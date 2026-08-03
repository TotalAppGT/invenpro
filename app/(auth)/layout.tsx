export const dynamic = "force-dynamic";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="cosmic-bg relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0a1a] px-4 py-12 sm:px-6 lg:px-8">
      <div className="cosmic-grid" />
      <div className="cosmic-orb cosmic-orb-1" />
      <div className="cosmic-orb cosmic-orb-2" />
      <div className="cosmic-orb cosmic-orb-3" />
      <div className="cosmic-particle" />
      <div className="cosmic-particle" />
      <div className="cosmic-particle" />
      <div className="cosmic-particle" />
      <div className="cosmic-particle" />
      <div className="cosmic-particle" />
      <div className="cosmic-particle" />
      <div className="cosmic-particle" />
      <div className="relative z-10 w-full">{children}</div>
    </div>
  );
}
