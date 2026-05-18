import type {
  User,
  Contest,
  Match,
  Team,
  Group,
  Prediction,
  TournamentPrediction,
  LeaderboardEntry,
  RankingSnapshot,
  ContestSettings,
  Prizepool,
  Payout,
  ScorerCandidate,
  MatchPhase,
  MatchStatus,
  PredictionStatus,
  ContestStatus,
  Role,
} from "@prisma/client"

export type {
  User,
  Contest,
  Match,
  Team,
  Group,
  Prediction,
  TournamentPrediction,
  LeaderboardEntry,
  RankingSnapshot,
  ContestSettings,
  Prizepool,
  Payout,
  ScorerCandidate,
  MatchPhase,
  MatchStatus,
  PredictionStatus,
  ContestStatus,
  Role,
}

// ---------------------------------------------------------------------------
// Tournament Template (JSON structure)
// ---------------------------------------------------------------------------

export interface TournamentTemplateData {
  name: string
  slug: string
  edition: string
  format: "WORLD_CUP" | "EURO" | "OTHER"
  startDate: string
  endDate: string
  groups: TemplateGroup[]
  teams: TemplateTeam[]
  groupMatches: TemplateMatch[]
  knockoutMatches: TemplateKnockoutMatch[]
  scorerCandidates: TemplateScorerCandidate[]
}

export interface TemplateGroup {
  letter: string
  name: string
  teamCodes: string[]
}

export interface TemplateTeam {
  code: string
  name: string
  flagEmoji: string
  group: string
}

export interface TemplateMatch {
  matchNumber: number
  phase: "GROUP"
  kickoff: string
  homeTeamCode: string
  awayTeamCode: string
  groupLetter: string
  venue?: string
}

export interface TemplateKnockoutMatch {
  matchNumber: number
  phase: "ROUND_OF_16" | "QUARTER_FINAL" | "SEMI_FINAL" | "FINAL" | "THIRD_PLACE"
  kickoff: string
  knockoutLabel: string
  venue?: string
}

export interface TemplateScorerCandidate {
  name: string
  teamCode: string
}

// ---------------------------------------------------------------------------
// Extended types with relations
// ---------------------------------------------------------------------------

export type MatchWithTeams = Match & {
  homeTeam: Team | null
  awayTeam: Team | null
}

export type PredictionWithMatch = Prediction & {
  match: MatchWithTeams
}

export type LeaderboardEntryWithUser = LeaderboardEntry & {
  user: Pick<User, "id" | "firstName" | "lastName" | "avatarSeed" | "email">
}

export type ContestWithRelations = Contest & {
  settings: ContestSettings | null
  prizepool: (Prizepool & { payouts: Payout[] }) | null
  template: { name: string; slug: string; format: string }
  _count: { participants: number }
}

export type MatchWithPrediction = MatchWithTeams & {
  prediction: Prediction | null
  isLocked: boolean
}

export type GroupWithTeams = Group & {
  teams: Array<{
    id: string
    teamId: string
    groupId: string
    position: number | null
    team: Team
  }>
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

export interface ScoreResult {
  points: number
  status: PredictionStatus
  isExactScore: boolean
  isCorrectResult: boolean
}

// ---------------------------------------------------------------------------
// Leaderboard
// ---------------------------------------------------------------------------

export interface LeaderboardRow extends LeaderboardEntryWithUser {
  movement: "up" | "down" | "same" | "new"
  movementAmount: number
  isITM: boolean
  isPodium: boolean
  payoutAmount?: number
}

export interface RankingEvolutionPoint {
  matchday: number
  rank: number
  points: number
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export interface ResultEntry {
  matchId: string
  homeScore: number
  awayScore: number
}

export interface InviteFormData {
  email: string
  firstName: string
  lastName: string
  contestId?: string
}

// ---------------------------------------------------------------------------
// Session user (augmented)
// ---------------------------------------------------------------------------

export interface SessionUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: Role
  avatarSeed: string
  name?: string | null
  image?: string | null
}
