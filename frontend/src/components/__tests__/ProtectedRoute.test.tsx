import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '../ProtectedRoute';
import { useAuth } from '../../context/AuthContext';

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

const mockedUseAuth = useAuth as unknown as ReturnType<typeof vi.fn>;

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/teams" element={<div>Teams content</div>} />
        </Route>
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  it('shows a spinner while auth is loading', () => {
    mockedUseAuth.mockReturnValue({ user: null, loading: true });
    renderAt('/teams');
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('redirects to /login when there is no user', () => {
    mockedUseAuth.mockReturnValue({ user: null, loading: false });
    renderAt('/teams');
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('renders the child route when authenticated', () => {
    mockedUseAuth.mockReturnValue({
      user: { id: 1, email: 'p@test.com', username: 'p', role: 'player' },
      loading: false,
    });
    renderAt('/teams');
    expect(screen.getByText('Teams content')).toBeInTheDocument();
  });
});
