'use client';

import { useState, useTransition } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { browserClient } from '@/lib/api/client';

type GeneratedMeta = {
  title?: string;
  description?: string;
  learning_outcomes?: string[];
  requirements?: string[];
};

export function AiGenerateButton({
  onApply,
}: {
  onApply: (meta: GeneratedMeta) => void;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [result, setResult] = useState<GeneratedMeta | null>(null);

  function generate() {
    if (!topic.trim()) {
      toast.error('Topic is required');
      return;
    }
    startTransition(async () => {
      const client = browserClient();
      const { data, error } = await client.POST('/ai/generate-course-meta' as never, {
        body: { topic: topic.trim(), level } as never,
      } as never);
      if (error) {
        toast.error('AI generation failed');
        return;
      }
      setResult(data as GeneratedMeta);
      toast.success('Generated — review and apply');
    });
  }

  function apply() {
    if (!result) return;
    onApply(result);
    toast.success('Applied to form');
    setOpen(false);
    setResult(null);
    setTopic('');
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Sparkles className="size-3.5" />
          AI generate
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>AI course metadata</DialogTitle>
          <DialogDescription>
            Generate course title, description, learning outcomes, and requirements from a topic.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Topic *</Label>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Machine learning with Python"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Level</Label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value as typeof level)}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          <Button type="button" onClick={generate} disabled={isPending} className="self-start">
            {isPending ? <Loader2 className="animate-spin" /> : <Sparkles />}
            Generate
          </Button>

          {result ? (
            <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-2">
              {result.title ? <div><strong>Title:</strong> {result.title}</div> : null}
              {result.description ? <div><strong>Description:</strong> {result.description}</div> : null}
              {result.learning_outcomes?.length ? (
                <div>
                  <strong>Learning outcomes:</strong>
                  <ul className="list-inside list-disc text-muted-foreground">
                    {result.learning_outcomes.map((o, i) => (
                      <li key={i}>{o}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {result.requirements?.length ? (
                <div>
                  <strong>Requirements:</strong>
                  <ul className="list-inside list-disc text-muted-foreground">
                    {result.requirements.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={apply} disabled={!result || isPending}>
            Apply to form
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
