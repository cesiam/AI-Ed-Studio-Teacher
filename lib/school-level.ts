// U.S. school levels, derived from a scenario's grade (0 = kindergarten).
// Massachusetts districts mostly split K–5 / 6–8 / 9–12, so PFPS does too.

export type SchoolLevel = 'elementary' | 'middle' | 'high'

export const SCHOOL_LEVELS: { value: SchoolLevel; label: string; grades: string }[] = [
  { value: 'elementary', label: 'Elementary', grades: 'K–5' },
  { value: 'middle', label: 'Middle', grades: '6–8' },
  { value: 'high', label: 'High', grades: '9–12' },
]

export function levelFor(grade: number): SchoolLevel {
  if (grade <= 5) return 'elementary'
  if (grade <= 8) return 'middle'
  return 'high'
}

export function isSchoolLevel(v: unknown): v is SchoolLevel {
  return SCHOOL_LEVELS.some((l) => l.value === v)
}

/** "grade 3" or "kindergarten". */
export function gradeLabel(grade: number): string {
  return grade === 0 ? 'kindergarten' : `grade ${grade}`
}
