// Coach personalities. Picked before the conference (setup page or laptop);
// the server turns `voice` into the coach's tone. Every style names the move
// and leaves the wording to the teacher.

export type CoachStyle = 'encouraging' | 'direct' | 'questioning' | 'tough'

export const COACH_STYLES: { value: CoachStyle; label: string; blurb: string; voice: string }[] = [
  {
    value: 'encouraging',
    label: 'Encouraging',
    blurb: 'Notices what went well, then suggests the next step.',
    voice:
      'Warm and affirming. When the teacher did something well, say so briefly, then suggest the next move. Gentle, never gushing.',
  },
  {
    value: 'direct',
    label: 'Direct',
    blurb: 'Short and to the point. No cushioning.',
    voice:
      'Brief and blunt, like a busy colleague. One short sentence where possible. Name the next move plainly; skip praise and softening words.',
  },
  {
    value: 'questioning',
    label: 'Questioning',
    blurb: 'Asks you a question so you find the next move yourself.',
    voice:
      'Socratic. Phrase the tip as one question that points the teacher at the next move without stating it, e.g. "What do you know about her mornings yet?" Never answer your own question.',
  },
  {
    value: 'tough',
    label: 'Tough mentor',
    blurb: 'Points out what you missed and how the parent may be hearing you.',
    voice:
      'A demanding mentor. Be candid about what the teacher missed or how their last line may have landed with the parent, then name the better move. Critical but fair, never insulting. Don’t praise unless it’s earned.',
  },
]

export const DEFAULT_COACH_STYLE: CoachStyle = 'encouraging'

export function isCoachStyle(v: unknown): v is CoachStyle {
  return COACH_STYLES.some((s) => s.value === v)
}
