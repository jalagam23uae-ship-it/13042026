'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function SearchForm({ defaultQuery }: { defaultQuery: string }) {
  const router = useRouter();
  const [value, setValue] = useState(defaultQuery);

  return (
    <form
      className="flex gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const q = value.trim();
        router.push(q ? `/search?q=${encodeURIComponent(q)}` : '/search');
      }}
    >
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search courses, lessons, announcements…"
        autoFocus
      />
      <Button type="submit">
        <Search />
        Search
      </Button>
    </form>
  );
}
