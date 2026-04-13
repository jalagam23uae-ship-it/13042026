'use client';

import { useState, type FormEvent } from 'react';
import { Send, Loader2, Bot, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { SafeMarkdown } from '@/components/safe-markdown';
import { browserClient } from '@/lib/api/client';
import { cn } from '@/lib/utils';

type Msg = { role: 'user' | 'assistant'; content: string };

export function AiChat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const next: Msg[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setLoading(true);

    try {
      const client = browserClient();
      const { data, error } = await client.POST('/ai/chat', {
        body: {
          message: text,
          history: next
            .slice(0, -1)
            .map((m) => ({ role: m.role, content: m.content })),
        } as never,
      });

      const reply =
        !error && data && typeof (data as { reply?: unknown }).reply === 'string'
          ? (data as { reply: string }).reply
          : 'Failed to get a response.';

      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Network error. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex min-h-64 flex-col gap-3">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Ask anything about your courses to get started.
          </p>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              className={cn(
                'flex items-start gap-3 rounded-lg border p-3 text-sm',
                msg.role === 'user' ? 'bg-muted/40' : 'bg-background',
              )}
            >
              {msg.role === 'user' ? (
                <UserIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              ) : (
                <Bot className="mt-0.5 size-4 shrink-0 text-primary" />
              )}
              <div className="flex-1">
                {msg.role === 'assistant' ? (
                  <SafeMarkdown text={msg.content} />
                ) : (
                  <p>{msg.content}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={send} className="flex items-end gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question…"
          rows={2}
          disabled={loading}
          className="resize-none"
        />
        <Button type="submit" disabled={loading || !input.trim()}>
          {loading ? <Loader2 className="animate-spin" /> : <Send />}
          <span className="sr-only">Send</span>
        </Button>
      </form>
    </div>
  );
}
