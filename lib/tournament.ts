import fs from "fs"
import path from "path"
import type { TournamentTemplateData } from "@/types"

export function loadTournamentTemplate(slug: string): TournamentTemplateData {
  const filePath = path.join(process.cwd(), "data", "tournaments", `${slug}.json`)
  const raw = fs.readFileSync(filePath, "utf-8")
  return JSON.parse(raw) as TournamentTemplateData
}

export function listTournamentTemplates(): Array<{ slug: string; name: string; edition: string }> {
  const dir = path.join(process.cwd(), "data", "tournaments")
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"))

  return files.map((file) => {
    const raw = fs.readFileSync(path.join(dir, file), "utf-8")
    const data = JSON.parse(raw) as TournamentTemplateData
    return { slug: data.slug, name: data.name, edition: data.edition }
  })
}
