"use server"

import { auth } from "@/lib/auth"
import { importFromOpenFootball, importFromLocalFile } from "@/lib/openfootball"
import { revalidatePath } from "next/cache"
import path from "path"

async function requireAdmin() {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Accès refusé.")
  }
}

export async function importOpenFootballContest(formData: {
  year: string
  competition: string
  contestName: string
  buyIn: number
}) {
  await requireAdmin()

  const result = await importFromOpenFootball({
    year: formData.year,
    competition: formData.competition,
    contestName: formData.contestName,
    buyIn: formData.buyIn,
  })

  if (!result.success) {
    return { error: result.error }
  }

  revalidatePath("/admin")
  revalidatePath("/admin/concours")
  return { success: true, contestId: result.contestId }
}

export async function importLocalJsonContest(formData: {
  slug: string
  contestName: string
  buyIn: number
}) {
  await requireAdmin()

  const filePath = path.join(process.cwd(), "data", "tournaments", `${formData.slug}.json`)

  const result = await importFromLocalFile(filePath, {
    contestName: formData.contestName,
    buyIn: formData.buyIn,
    slug: formData.slug,
  })

  if (!result.success) {
    return { error: result.error }
  }

  revalidatePath("/admin")
  revalidatePath("/admin/concours")
  return { success: true, contestId: result.contestId }
}
