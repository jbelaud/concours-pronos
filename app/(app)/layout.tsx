import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { TopBar } from "@/components/layout/top-bar"
import { BottomNav } from "@/components/layout/bottom-nav"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  return (
    <div className="flex flex-col min-h-dvh">
      <TopBar />
      <main className="flex-1 pb-24 max-w-lg mx-auto w-full px-4 py-4">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
