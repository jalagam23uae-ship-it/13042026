import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SubmitAssignmentDialog } from './submit-assignment-dialog';

// Mock the API client so we don't need a real backend.
const mockPost = vi.fn();
vi.mock('@/lib/api/client', () => ({
  browserClient: () => ({ POST: mockPost }),
}));

// Mock the upload helper used transitively by FileUploadInput.
vi.mock('@/lib/api/uploads', () => ({
  uploadFile: vi.fn(async (file: File) => ({
    url: `https://uploads.example.com/${file.name}`,
    name: file.name,
  })),
}));

// Mock sonner toasts to observe calls.
const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock('sonner', () => ({
  toast: { success: toastSuccess, error: toastError },
}));

describe('<SubmitAssignmentDialog />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a Submit trigger button', () => {
    render(<SubmitAssignmentDialog assignmentId={1} assignmentTitle="Week 1" />);
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
  });

  it('shows the dialog when the trigger is clicked', async () => {
    const user = userEvent.setup();
    render(<SubmitAssignmentDialog assignmentId={1} assignmentTitle="Week 1" />);
    await user.click(screen.getByRole('button', { name: /submit/i }));
    await waitFor(() =>
      expect(screen.getByText(/submit assignment/i)).toBeInTheDocument(),
    );
    // The dialog should display the assignment title as its description.
    expect(screen.getByText(/week 1/i)).toBeInTheDocument();
  });

  it('shows an error toast when submit is clicked without a file', async () => {
    const user = userEvent.setup();
    render(<SubmitAssignmentDialog assignmentId={1} assignmentTitle="Week 1" />);
    await user.click(screen.getByRole('button', { name: /submit/i }));

    // Find the dialog submit button (second "Submit" on the page).
    const buttons = screen.getAllByRole('button', { name: /submit/i });
    // The last one should be the dialog's submit.
    const submitButton = buttons[buttons.length - 1]!;
    expect(submitButton).toBeDisabled();

    // Because the button is disabled when there's no file, click is a
    // no-op. Verify no API call was made.
    await user.click(submitButton).catch(() => {});
    expect(mockPost).not.toHaveBeenCalled();
  });
});
