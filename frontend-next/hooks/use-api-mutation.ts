'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

type Options<TData> = {
  onSuccess?: (data: TData) => void;
  successMessage?: string;
  errorMessage?: string;
  refresh?: boolean;
};

type ApiResult<TData> = {
  data?: TData;
  error?: { detail?: string } | unknown;
};

export function useApiMutation<TArgs, TData>(
  fn: (args: TArgs) => Promise<ApiResult<TData>>,
  options: Options<TData> = {},
) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const mutate = (args: TArgs) => {
    startTransition(async () => {
      const { data, error } = await fn(args);
      if (error) {
        const detail =
          typeof error === 'object' &&
          error !== null &&
          'detail' in error &&
          typeof (error as { detail: unknown }).detail === 'string'
            ? (error as { detail: string }).detail
            : (options.errorMessage ?? 'Something went wrong');
        toast.error(detail);
        return;
      }
      if (options.successMessage) toast.success(options.successMessage);
      if (data !== undefined) options.onSuccess?.(data);
      if (options.refresh !== false) router.refresh();
    });
  };

  return { mutate, isPending };
}
