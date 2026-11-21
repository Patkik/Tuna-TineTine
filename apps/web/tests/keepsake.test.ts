import { describe, it, expect } from 'vitest';
import { formatKeepsakeFilename } from '../src/core/keepsakeGenerator';

describe('Keepsake Exporter', () => {
  it('should format filename with Kristine and target date', () => {
    const filename = formatKeepsakeFilename('Kristine', '2027-02-05');
    expect(filename).toBe('Kristine-Beach-Birthday-2027-02-05.png');
  });
});
