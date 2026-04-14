import { requireUser } from '@/lib/auth/session';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';
import { AiChat } from './_components/ai-chat';

export default async function AiAssistantPage() {
  await requireUser();
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Sparkles className="size-6 text-primary" />
          AI Assistant
        </h1>
        <p className="text-sm text-muted-foreground">
          Ask questions about your course material. All AI output is sanitized — no
          dangerouslySetInnerHTML.
        </p>
      </div>

      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle className="text-base">Chat</CardTitle>
          <CardDescription>Messages are rendered through react-markdown + rehype-sanitize.</CardDescription>
        </CardHeader>
        <CardContent>
          <AiChat />
        </CardContent>
      </Card>
    </div>
  );
}
