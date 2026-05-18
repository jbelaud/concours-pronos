export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6 field-texture">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  )
}
