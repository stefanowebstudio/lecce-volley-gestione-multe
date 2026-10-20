import { FINE_RULES, type FineCategory } from '../constants/fineRules';

export type FineCalculation = { baseAmount: number; multiplier: 1 | 2; finalAmount: number };

export function calculateTrainingDelayFine(minutes: number, communicatedInAdvance = false): number {
  if (!Number.isFinite(minutes) || minutes <= 0 || communicatedInAdvance) return 0;
  return Math.min(30, 3 + Math.floor(Math.max(0, minutes - 1) / 5));
}

export function calculateMatchDelayFine(minutes: number): number {
  if (!Number.isFinite(minutes) || minutes <= 0) return 0;
  return Math.min(50, 3 + Math.max(0, Math.floor(minutes) - 5));
}

export function calculateFine(baseAmount: number, isMatchDay: boolean): FineCalculation {
  if (!Number.isFinite(baseAmount) || baseAmount < 0) throw new Error('L’importo deve essere un numero non negativo.');
  const multiplier: 1 | 2 = isMatchDay ? 2 : 1;
  const roundedBase = Math.round(baseAmount * 100) / 100;
  return { baseAmount: roundedBase, multiplier, finalAmount: Math.round(roundedBase * multiplier * 100) / 100 };
}

export function calculateBottleFine(bottleLeft: boolean, numberMissing: boolean): number {
  return (bottleLeft ? 2 : 0) + (numberMissing ? 2 : 0);
}

export function calculateCategoryBase(category: FineCategory, minutes = 0, communicatedInAdvance = false): number {
  if (category === 'TRAINING_DELAY') return calculateTrainingDelayFine(minutes, communicatedInAdvance);
  if (category === 'MATCH_DELAY') return calculateMatchDelayFine(minutes);
  const rule = FINE_RULES[category];
  if (rule.kind === 'PASTRY') return 0;
  return rule.amount ?? 0;
}
