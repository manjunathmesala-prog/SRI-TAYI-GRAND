import { describe, it, expect } from 'vitest';
import { repo } from '@/lib/db/repository';
import { normalizeCategoryId } from '@/lib/pricing';

describe('Walk-in state and category matching regression tests', () => {
  it('maps Supabase category UUIDs to canonical category IDs', () => {
    expect(normalizeCategoryId('d0000000-0000-0000-0000-000000000001')).toBe('cat-suite-01');
    expect(normalizeCategoryId('d0000000-0000-0000-0000-000000000002')).toBe('cat-four-bed-02');
    expect(normalizeCategoryId('d0000000-0000-0000-0000-000000000003')).toBe('cat-double-03');
    expect(normalizeCategoryId('d0000000-0000-0000-0000-000000000004')).toBe('cat-single-04');
  });

  it('guarantees all categories have matching physical rooms in getFullState', async () => {
    await repo.ensureAllLoaded();
    const state = repo.getFullState();

    expect(state.categories.length).toBeGreaterThan(0);
    expect(state.rooms.length).toBeGreaterThan(0);

    for (const cat of state.categories) {
      const canonicalCatId = normalizeCategoryId(cat.id);
      const matchingRooms = state.rooms.filter(
        (r) => r.category_id === cat.id || normalizeCategoryId(r.category_id) === canonicalCatId
      );
      expect(matchingRooms.length, `Category "${cat.name}" must have matching physical rooms`).toBeGreaterThan(0);
    }
  });
});
