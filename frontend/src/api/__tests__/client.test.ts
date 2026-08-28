import { describe, expect, it } from 'vitest';
import { API_BASE } from '../client';

describe('API_BASE', () => {
  it("defaults to same-origin '/api' when VITE_API_URL is unset", () => {
    expect(import.meta.env.VITE_API_URL).toBeUndefined();
    expect(API_BASE).toBe('/api');
  });
});
