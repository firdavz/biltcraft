import type { HabitConfig } from './habbit-store';
export const quotes = [
  ['Well done is better than well said.', 'Benjamin Franklin'],
  ['Lost time is never found again.', 'Benjamin Franklin'],
  ['While we are postponing, life speeds by.', 'Seneca'],
  [
    'Seize the very first possible opportunity to act on every resolution you make.',
    'William James',
  ],
  [
    'We become just by doing just acts, temperate by doing temperate acts, brave by doing brave acts.',
    'Aristotle',
  ],
  ['We are what we repeatedly do. Excellence, then, is not an act, but a habit.', 'Will Durant'],
  ['First say to yourself what you would be; and then do what you have to do.', 'Epictetus'],
  ['Waste no more time arguing about what a good man should be. Be one.', 'Marcus Aurelius'],
  ['Every action you take is a vote for the type of person you wish to become.', 'James Clear'],
  [
    'You do not rise to the level of your goals. You fall to the level of your systems.',
    'James Clear',
  ],
];
export function shameMessage(c: HabitConfig, day: number, misses: number) {
  const callout = c.gender === 'He' ? 'MAN' : 'GIRL';
  const him = c.gender === 'He' ? 'him' : 'her';
  const messages = [
    `Breaking promises, ${callout}? Was ${c.habit} a promise or just talk? Day ${day}. Weak?`,
    `Well done, ${callout}. ${c.habit} lasted ${day} days. 👏`,
    `Keep that up, ${callout}. Excuses are really working for you.`,
    `${c.habit} skipped again. All talk, ${c.name}?`,
    `Chat, ${c.name} skipped ${c.habit} again. Who wants to tell ${him}?`,
    `Lazy or scared, ${c.name}? Which one is it?`,
    `Day ${day} of ${c.totalDays} and you fold? Weak, ${callout}.`,
    `Everyone here believed you, ${callout}. Day ${day}. You let us all down.`,
    `Your word means nothing, ${c.name}. ${c.habit} skipped again. 🗑️`,
    `Still pretending you're serious about ${c.habit}, ${callout}? Prove it or stop talking.`,
  ];
  return messages[misses > 10 ? 5 + Math.floor(Math.random() * 5) : Math.max(0, misses - 1)];
}
export function approvedMessage(c: HabitConfig, day: number, auto = false) {
  const callout = c.gender === 'He' ? 'MAN' : 'GIRL';
  const his = c.gender === 'He' ? 'his' : 'her';
  const messages = [
    `✅ ${c.name} showed up. Day ${day}/${c.totalDays}. Respect.`,
    `Day ${day} done. Not playing around, ${callout}.`,
    `Proof accepted. ${c.name} kept ${his} word today.`,
    `Another vote for the new ${c.name}. Day ${day}/${c.totalDays}.`,
    `Excuses: 0. ${c.name}: day ${day}. Keep going.`,
  ];
  return messages[Math.floor(Math.random() * messages.length)] + (auto ? ' (auto-approved)' : '');
}
export function kickoff(c: HabitConfig) {
  return `${c.name} just started Habbit: ${c.habit} for ${c.totalDays} days. You are ${c.gender === 'He' ? 'his' : 'her'} witnesses. Don't let ${c.gender === 'He' ? 'him' : 'her'} get away with excuses.`;
}
