import { describe, expect, it } from 'vitest';
import { calculateBottleFine, calculateFine, calculateMatchDelayFine, calculateTrainingDelayFine } from './fineCalculator';

describe('motore importi Lecce Volley', () => {
  it.each([[5, 3], [6, 4], [10, 4], [11, 5], [1000, 30]])('ritardo allenamento %i minuti = €%i', (minutes, expected) => {
    expect(calculateTrainingDelayFine(minutes)).toBe(expected);
  });
  it('esclude il ritardo allenamento comunicato preventivamente', () => {
    expect(calculateTrainingDelayFine(12, true)).toBe(0);
  });
  it.each([[5, 3], [6, 4], [10, 8], [1000, 50]])('ritardo partita %i minuti = €%i', (minutes, expected) => {
    expect(calculateMatchDelayFine(minutes)).toBe(expected);
  });
  it('applica il raddoppio solo all’importo economico', () => {
    expect(calculateFine(5, false).finalAmount).toBe(5);
    expect(calculateFine(5, true).finalAmount).toBe(10);
    expect(calculateFine(15, true).finalAmount).toBe(30);
  });
  it('somma separatamente le due infrazioni bottiglietta', () => {
    expect(calculateBottleFine(true, true)).toBe(4);
  });
});
