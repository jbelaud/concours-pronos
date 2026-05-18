/**
 * OpenFootball data importer.
 *
 * Fetches tournament data from the openfootball/worldcup.json GitHub repo,
 * parses it into our internal types, and persists everything to the database.
 *
 * Source: https://github.com/openfootball/worldcup.json
 *
 * OpenFootball JSON shape:
 * {
 *   name: string,
 *   rounds: Array<{
 *     name: string,          // "Matchday 1", "Round of 16", etc.
 *     matches: Array<{
 *       num: number,
 *       date: string,        // "2026-06-11"
 *       time: string,        // "20:00"
 *       team1: { name: string, code: string },
 *       team2: { name: string, code: string },
 *       score?: { ft: [number, number] },
 *       group?: { name: string, letter: string }
 *       stadium?: { key: string, name: string, city: string }
 *     }>
 *   }>
 * }
 */

import { db } from "@/lib/db"
import type { MatchPhase } from "@prisma/client"
import { addDays } from "date-fns"

// ---------------------------------------------------------------------------
// Remote JSON shapes
// ---------------------------------------------------------------------------

interface OFBTeam {
  name: string
  code: string
}

interface OFBScore {
  ft: [number, number]
}

interface OFBStadium {
  key?: string
  name?: string
  city?: string
}

interface OFBGroup {
  name: string
  letter?: string
}

interface OFBMatch {
  num: number
  date: string
  time?: string
  team1: OFBTeam
  team2: OFBTeam
  score?: OFBScore
  group?: OFBGroup
  stadium?: OFBStadium
}

interface OFBRound {
  name: string
  matches: OFBMatch[]
}

interface OFBTournament {
  name: string
  rounds: OFBRound[]
}

// ---------------------------------------------------------------------------
// Phase detection
// ---------------------------------------------------------------------------

const PHASE_MAP: Record<string, MatchPhase> = {
  "matchday": "GROUP",
  "group": "GROUP",
  "round of 16": "ROUND_OF_16",
  "huitièmes": "ROUND_OF_16",
  "quarterfinal": "QUARTER_FINAL",
  "quarter-final": "QUARTER_FINAL",
  "quart": "QUARTER_FINAL",
  "semifinal": "SEMI_FINAL",
  "semi-final": "SEMI_FINAL",
  "demi": "SEMI_FINAL",
  "third": "THIRD_PLACE",
  "3rd": "THIRD_PLACE",
  "troisième": "THIRD_PLACE",
  "final": "FINAL",
  "finale": "FINAL",
}

function detectPhase(roundName: string): MatchPhase {
  const lower = roundName.toLowerCase()
  for (const [key, phase] of Object.entries(PHASE_MAP)) {
    if (lower.includes(key)) return phase
  }
  return "GROUP"
}

function extractGroupLetter(roundName: string, groupObj?: OFBGroup): string | undefined {
  if (groupObj?.letter) return groupObj.letter
  if (groupObj?.name) {
    const match = groupObj.name.match(/[A-L]/)
    if (match) return match[0]
  }
  const match = roundName.match(/[Gg]roup\s+([A-L])|[Gg]roupe\s+([A-L])/)
  if (match) return match[1] ?? match[2]
  return undefined
}

// ---------------------------------------------------------------------------
// Country flag emoji helper (ISO 3166-1 alpha-2 codes)
// ---------------------------------------------------------------------------

const FLAG_OVERRIDES: Record<string, string> = {
  ENG: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  SCO: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  WAL: "🏴󠁧󠁢󠁷󠁬󠁳󠁿",
}

const CODE_TO_ISO2: Record<string, string> = {
  USA: "US", MEX: "MX", CAN: "CA", NZL: "NZ",
  ARG: "AR", CHI: "CL", URU: "UY", NIG: "NG",
  ENG: "GB", AUS: "AU", SEN: "SN", SVK: "SK",
  FRA: "FR", BEL: "BE", MOR: "MA", PHI: "PH",
  ESP: "ES", POR: "PT", ALG: "DZ", NOR: "NO",
  BRE: "BR", BRA: "BR", PAR: "PY", EQU: "EC", TAN: "TZ",
  GER: "DE", NED: "NL", GHA: "GH", PAK: "PK",
  JPN: "JP", KOR: "KR", COL: "CO", GUA: "GT",
  ITA: "IT", CRO: "HR", EGY: "EG", BLZ: "BZ",
  DAN: "DK", SUI: "CH", ECO: "GB-SCT", BEN: "BJ",
  SAU: "SA", IRN: "IR", CAM: "CM", ANT: "AG",
  HOL: "NL", QAT: "QA", REP: "DO",
}

function codeToFlagEmoji(code: string): string {
  if (FLAG_OVERRIDES[code]) return FLAG_OVERRIDES[code]
  const iso = CODE_TO_ISO2[code] ?? code.slice(0, 2)
  if (iso.length !== 2) return "🏳️"
  return String.fromCodePoint(...iso.toUpperCase().split("").map((c) => 0x1F1E0 + c.charCodeAt(0) - 65))
}

// ---------------------------------------------------------------------------
// Date parser — OpenFootball uses "2026-06-11" + "20:00" (Europe/Paris → UTC)
// ---------------------------------------------------------------------------

function parseKickoffUTC(date: string, time?: string): Date {
  const timeStr = time ?? "20:00"
  const [y, m, d] = date.split("-").map(Number)
  const [h, min] = timeStr.split(":").map(Number)

  // Paris is UTC+2 during summer (CEST)
  const parisOffsetHours = 2
  const utcHour = h - parisOffsetHours
  const utcDate = new Date(Date.UTC(y, m - 1, d, utcHour, min, 0))
  return utcDate
}

// ---------------------------------------------------------------------------
// Fetch OpenFootball data
// ---------------------------------------------------------------------------

const BASE_URL =
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master"

export interface OpenFootballImportOptions {
  /** e.g. "2026" */
  year: string
  /** e.g. "worldcup" */
  competition?: string
  /** Contest name to create */
  contestName: string
  /** Buy-in amount */
  buyIn?: number
}

export async function importFromOpenFootball(
  options: OpenFootballImportOptions
): Promise<{ success: true; contestId: string } | { success: false; error: string }> {
  const { year, competition = "worldcup", contestName, buyIn = 0 } = options

  // Try multiple file naming conventions used by openfootball
  const candidates = [
    `${BASE_URL}/${year}/${competition}.json`,
    `${BASE_URL}/${year}/${competition}/${competition}.json`,
    `${BASE_URL}/${year}/${competition}-groups.json`,
  ]

  let data: OFBTournament | null = null

  for (const url of candidates) {
    try {
      const res = await fetch(url, { next: { revalidate: 3600 } })
      if (res.ok) {
        data = (await res.json()) as OFBTournament
        break
      }
    } catch {
      // try next candidate
    }
  }

  if (!data) {
    return {
      success: false,
      error: `Impossible de récupérer les données OpenFootball pour ${year}/${competition}. Vérifie l'URL ou importe un fichier JSON local.`,
    }
  }

  return importOFBData(data, { contestName, buyIn, slug: `${competition}-${year}` })
}

// ---------------------------------------------------------------------------
// Local JSON format (our own schema in data/tournaments/*.json)
// ---------------------------------------------------------------------------

interface LocalTournamentJSON {
  name: string
  slug: string
  edition: string
  format: string
  startDate: string
  endDate: string
  groups: Array<{ letter: string; name: string; teamCodes: string[] }>
  teams: Array<{ code: string; name: string; flagEmoji?: string; group?: string }>
  groupMatches: Array<{
    matchNumber: number
    phase: string
    kickoff: string
    homeTeamCode: string
    awayTeamCode: string
    groupLetter: string
    venue?: string
  }>
  knockoutMatches: Array<{
    matchNumber: number
    phase: string
    kickoff: string
    knockoutLabel?: string
    venue?: string
  }>
  scorerCandidates?: Array<{ name: string; teamCode: string }>
}

async function importLocalFormat(
  data: LocalTournamentJSON,
  options: { contestName: string; buyIn?: number; slug: string }
): Promise<{ success: true; contestId: string } | { success: false; error: string }> {
  const { contestName, buyIn = 0, slug } = options

  let template = await db.tournamentTemplate.findUnique({ where: { slug } })
  if (!template) {
    template = await db.tournamentTemplate.create({
      data: {
        name: data.name,
        slug,
        edition: data.edition,
        format: data.format,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        jsonFile: `${slug}.json`,
      },
    })
  }

  const contest = await db.contest.create({
    data: { name: contestName, templateId: template.id, buyIn, status: "DRAFT" },
  })

  await db.contestSettings.create({
    data: {
      contestId: contest.id,
      pointsCorrectResult: 3,
      pointsExactScore: 1,
      pointsWrongResult: 0,
      pointsWinner: 10,
      pointsTopScorer: 5,
      pointsBestAttack: 3,
      pointsBestDefense: 3,
      pointsGroupFirst: 2,
      pointsGroupSecond: 1,
    },
  })

  const prizepool = await db.prizepool.create({
    data: { contestId: contest.id, itmCount: 4 },
  })
  await db.payout.createMany({
    data: [
      { prizepoolId: prizepool.id, position: 1, amount: 250 },
      { prizepoolId: prizepool.id, position: 2, amount: 100 },
      { prizepoolId: prizepool.id, position: 3, amount: 50 },
      { prizepoolId: prizepool.id, position: 4, amount: 20 },
    ],
  })

  // Teams
  await db.team.createMany({
    data: data.teams.map((t) => ({
      contestId: contest.id,
      name: t.name,
      code: t.code,
      flagEmoji: t.flagEmoji ?? codeToFlagEmoji(t.code),
      group: t.group,
    })),
  })

  const teamRecords = await db.team.findMany({
    where: { contestId: contest.id },
    select: { id: true, code: true },
  })
  const codeToId = Object.fromEntries(teamRecords.map((t) => [t.code, t.id]))

  // Groups
  for (const g of data.groups) {
    const group = await db.group.create({
      data: { contestId: contest.id, name: g.name, letter: g.letter },
    })
    await db.groupTeam.createMany({
      data: g.teamCodes
        .filter((c) => codeToId[c])
        .map((c) => ({ groupId: group.id, teamId: codeToId[c] })),
      skipDuplicates: true,
    })
  }

  // Group matches
  await db.match.createMany({
    data: data.groupMatches.map((m) => ({
      contestId: contest.id,
      matchNumber: m.matchNumber,
      phase: m.phase as import("@prisma/client").MatchPhase,
      kickoff: new Date(m.kickoff),
      homeTeamId: codeToId[m.homeTeamCode] ?? null,
      awayTeamId: codeToId[m.awayTeamCode] ?? null,
      groupLetter: m.groupLetter ?? null,
      venue: m.venue ?? null,
    })),
  })

  // Knockout skeleton
  await db.match.createMany({
    data: data.knockoutMatches.map((m) => ({
      contestId: contest.id,
      matchNumber: m.matchNumber,
      phase: m.phase as import("@prisma/client").MatchPhase,
      kickoff: new Date(m.kickoff),
      knockoutLabel: m.knockoutLabel ?? null,
      venue: m.venue ?? null,
    })),
  })

  // Scorer candidates
  if (data.scorerCandidates?.length) {
    await db.scorerCandidate.createMany({
      data: data.scorerCandidates.map((s) => ({
        contestId: contest.id,
        name: s.name,
        teamCode: s.teamCode,
      })),
    })
  }

  return { success: true, contestId: contest.id }
}

// ---------------------------------------------------------------------------
// Import from a local file path (for offline use)
// ---------------------------------------------------------------------------

export async function importFromLocalFile(
  filePath: string,
  options: { contestName: string; buyIn?: number; slug: string }
): Promise<{ success: true; contestId: string } | { success: false; error: string }> {
  try {
    const fs = await import("fs/promises")
    const raw = await fs.readFile(filePath, "utf-8")
    const data = JSON.parse(raw)

    // Detect format: our local format has "groupMatches", OFB format has "rounds"
    if ("groupMatches" in data) {
      return importLocalFormat(data as LocalTournamentJSON, options)
    }
    return importOFBData(data as OFBTournament, options)
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// ---------------------------------------------------------------------------
// Core import logic
// ---------------------------------------------------------------------------

async function importOFBData(
  data: OFBTournament,
  options: { contestName: string; buyIn?: number; slug: string }
): Promise<{ success: true; contestId: string } | { success: false; error: string }> {
  const { contestName, buyIn = 0, slug } = options

  // Ensure TournamentTemplate exists
  let template = await db.tournamentTemplate.findUnique({ where: { slug } })
  if (!template) {
    const allDates = data.rounds
      .flatMap((r) => r.matches)
      .map((m) => parseKickoffUTC(m.date, m.time))
      .sort((a, b) => a.getTime() - b.getTime())

    template = await db.tournamentTemplate.create({
      data: {
        name: data.name,
        slug,
        edition: slug.split("-").pop() ?? "2026",
        format: slug.includes("worldcup") ? "WORLD_CUP" : slug.includes("euro") ? "EURO" : "OTHER",
        startDate: allDates[0] ?? new Date(),
        endDate: allDates.at(-1) ?? addDays(new Date(), 30),
        jsonFile: `${slug}.json`,
      },
    })
  }

  // Create contest
  const contest = await db.contest.create({
    data: {
      name: contestName,
      templateId: template.id,
      buyIn,
      status: "DRAFT",
    },
  })

  // Create default settings
  await db.contestSettings.create({
    data: {
      contestId: contest.id,
      pointsCorrectResult: 3,
      pointsExactScore: 1,
      pointsWrongResult: 0,
      pointsWinner: 10,
      pointsTopScorer: 5,
      pointsBestAttack: 3,
      pointsBestDefense: 3,
      pointsGroupFirst: 2,
      pointsGroupSecond: 1,
    },
  })

  // Create default prizepool
  const prizepool = await db.prizepool.create({
    data: { contestId: contest.id, itmCount: 4 },
  })
  await db.payout.createMany({
    data: [
      { prizepoolId: prizepool.id, position: 1, amount: 250 },
      { prizepoolId: prizepool.id, position: 2, amount: 100 },
      { prizepoolId: prizepool.id, position: 3, amount: 50 },
      { prizepoolId: prizepool.id, position: 4, amount: 20 },
    ],
  })

  // --- Extract all teams and groups from round data ---
  const teamMap = new Map<string, { name: string; code: string; group?: string }>()
  const groupLetterSet = new Map<string, Set<string>>()

  for (const round of data.rounds) {
    const phase = detectPhase(round.name)
    if (phase !== "GROUP") continue

    for (const match of round.matches) {
      const letter = extractGroupLetter(round.name, match.group)
      for (const team of [match.team1, match.team2]) {
        if (!teamMap.has(team.code)) {
          teamMap.set(team.code, { name: team.name, code: team.code, group: letter })
        }
        if (letter) {
          if (!groupLetterSet.has(letter)) groupLetterSet.set(letter, new Set())
          groupLetterSet.get(letter)!.add(team.code)
        }
      }
    }
  }

  // Create teams
  const teamRecords: Array<{ id: string; code: string }> = []
  for (const [code, teamData] of teamMap) {
    const team = await db.team.create({
      data: {
        contestId: contest.id,
        name: teamData.name,
        code,
        flagEmoji: codeToFlagEmoji(code),
        group: teamData.group,
      },
    })
    teamRecords.push({ id: team.id, code })
  }
  const codeToId = Object.fromEntries(teamRecords.map((t) => [t.code, t.id]))

  // Create groups
  const groupRecords = new Map<string, string>() // letter → group.id
  for (const [letter, teamCodes] of groupLetterSet) {
    const group = await db.group.create({
      data: {
        contestId: contest.id,
        name: `Groupe ${letter}`,
        letter,
      },
    })
    groupRecords.set(letter, group.id)

    await db.groupTeam.createMany({
      data: [...teamCodes].map((code) => ({
        groupId: group.id,
        teamId: codeToId[code],
      })),
      skipDuplicates: true,
    })
  }

  // Create matches
  let matchNumber = 1
  for (const round of data.rounds) {
    const phase = detectPhase(round.name)
    const isGroup = phase === "GROUP"

    for (const match of round.matches) {
      const kickoff = parseKickoffUTC(match.date, match.time)
      const letter = isGroup ? extractGroupLetter(round.name, match.group) : undefined
      const homeId = codeToId[match.team1.code]
      const awayId = codeToId[match.team2.code]

      const knockoutLabel = !isGroup ? round.name : undefined

      await db.match.create({
        data: {
          contestId: contest.id,
          matchNumber: match.num ?? matchNumber,
          phase,
          kickoff,
          venue: match.stadium?.name
            ? `${match.stadium.name}${match.stadium.city ? ", " + match.stadium.city : ""}`
            : undefined,
          homeTeamId: homeId ?? null,
          awayTeamId: awayId ?? null,
          homeScore: match.score?.ft[0] ?? null,
          awayScore: match.score?.ft[1] ?? null,
          status: match.score ? "FINISHED" : "SCHEDULED",
          groupLetter: letter ?? null,
          knockoutLabel: knockoutLabel ?? null,
        },
      })
      matchNumber++
    }
  }

  return { success: true, contestId: contest.id }
}
