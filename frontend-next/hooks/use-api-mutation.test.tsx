import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { useApiMutation } from './use-api-mutation';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  prefetch: vi.fn(),
};

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

describe('useApiMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls the fn with the mutate argument', async () => {
    const fn = vi.fn().mockResolvedValue({ data: { ok: true } });
    const { result } = renderHook(() => useApiMutation(fn));

    await act(async () => {
      result.current.mutate({ hello: 'world' });
    });

    await waitFor(() => expect(fn).toHaveBeenCalledTimes(1));
    expect(fn).toHaveBeenCalledWith({ hello: 'world' });
  });

  it('toasts the success message on success', async () => {
    const fn = vi.fn().mockResolvedValue({ data: { id: 1 } });
    const { result } = renderHook(() =>
      useApiMutation(fn, { successMessage: 'Saved' }),
    );

    await act(async () => {
      result.current.mutate(undefined);
    });

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Saved'));
  });

  it('calls onSuccess with the returned data', async () => {
    const fn = vi.fn().mockResolvedValue({ data: { id: 42 } });
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useApiMutation(fn, { onSuccess }));

    await act(async () => {
      result.current.mutate(undefined);
    });

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith({ id: 42 }));
  });

  it('calls router.refresh on success by default', async () => {
    const fn = vi.fn().mockResolvedValue({ data: {} });
    const { result } = renderHook(() => useApiMutation(fn));

    await act(async () => {
      result.current.mutate(undefined);
    });

    await waitFor(() => expect(mockRouter.refresh).toHaveBeenCalled());
  });

  it('skips router.refresh when refresh: false', async () => {
    const fn = vi.fn().mockResolvedValue({ data: {} });
    const { result } = renderHook(() =>
      useApiMutation(fn, { refresh: false }),
    );

    await act(async () => {
      result.current.mutate(undefined);
    });

    // Give the transition a microtask to complete
    await waitFor(() => expect(fn).toHaveBeenCalled());
    expect(mockRouter.refresh).not.toHaveBeenCalled();
  });

  it('toasts the FastAPI detail on error', async () => {
    const fn = vi.fn().mockResolvedValue({
      error: { detail: 'Email already registered' },
    });
    const { result } = renderHook(() => useApiMutation(fn));

    await act(async () => {
      result.current.mutate(undefined);
    });

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Email already registered'),
    );
  });

  it('falls back to errorMessage when error shape lacks detail', async () => {
    const fn = vi.fn().mockResolvedValue({
      error: { something: 'else' },
    });
    const { result } = renderHook(() =>
      useApiMutation(fn, { errorMessage: 'Something broke' }),
    );

    await act(async () => {
      result.current.mutate(undefined);
    });

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Something broke'),
    );
  });

  it('falls back to a generic message when neither detail nor errorMessage is set', async () => {
    const fn = vi.fn().mockResolvedValue({ error: {} });
    const { result } = renderHook(() => useApiMutation(fn));

    await act(async () => {
      result.current.mutate(undefined);
    });

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Something went wrong'),
    );
  });

  it('does not toast success / call onSuccess on error', async () => {
    const fn = vi.fn().mockResolvedValue({ error: { detail: 'boom' } });
    const onSuccess = vi.fn();
    const { result } = renderHook(() =>
      useApiMutation(fn, { successMessage: 'Saved', onSuccess }),
    );

    await act(async () => {
      result.current.mutate(undefined);
    });

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(toast.success).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(mockRouter.refresh).not.toHaveBeenCalled();
  });

  it('exposes isPending: false initially', () => {
    const fn = vi.fn().mockResolvedValue({ data: {} });
    const { result } = renderHook(() => useApiMutation(fn));
    expect(result.current.isPending).toBe(false);
  });
});
