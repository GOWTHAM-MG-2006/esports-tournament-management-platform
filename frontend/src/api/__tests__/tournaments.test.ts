import { describe, expect, it, vi, beforeEach } from 'vitest';
import api from '../client';
import { listTournaments, type Tournament } from '../tournaments';

vi.mock('../client', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const mockedGet = api.get as unknown as ReturnType<typeof vi.fn>;

function makeTournament(id: number): Tournament {
  return {
    id,
    name: `Cup ${id}`,
    game: 'LoL',
    format: 'single_elimination',
    status: 'registration_open',
    max_teams: 8,
    start_date: null,
    end_date: null,
    prize_pool: null,
    rules: null,
    created_by: {
      id: 1,
      email: 'org@test.com',
      username: 'org',
      role: 'organizer',
      date_joined: '2026-08-01',
    },
    registration_count: 0,
    created_at: '2026-08-01',
  };
}

describe('listTournaments', () => {
  beforeEach(() => {
    mockedGet.mockReset();
  });

  it('unwraps the envelope around a plain list', async () => {
    mockedGet.mockResolvedValue({
      data: { success: true, data: [makeTournament(1)], message: 'ok' },
    });
    const result = await listTournaments();
    expect(mockedGet).toHaveBeenCalledWith('/tournaments/');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Cup 1');
  });

  it('tolerates DRF pagination ({results: [...]})', async () => {
    mockedGet.mockResolvedValue({
      data: {
        success: true,
        data: { count: 2, results: [makeTournament(1), makeTournament(2)] },
        message: 'ok',
      },
    });
    const result = await listTournaments();
    expect(result).toHaveLength(2);
    expect(result[1].id).toBe(2);
  });
});
