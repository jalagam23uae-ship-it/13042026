'use client';

import { useState, useTransition } from 'react';
import { Check, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { browserClient } from '@/lib/api/client';

type Question = {
  id: number;
  body: string;
  option_a?: string | null;
  option_b?: string | null;
  option_c?: string | null;
  option_d?: string | null;
  correct_opt?: string | null;
  marks?: number | null;
};

type QuestionForm = {
  body: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_opt: 'A' | 'B' | 'C' | 'D';
  marks: number;
};

const EMPTY_FORM: QuestionForm = {
  body: '',
  option_a: '',
  option_b: '',
  option_c: '',
  option_d: '',
  correct_opt: 'A',
  marks: 1,
};

function formFromQuestion(q: Question): QuestionForm {
  return {
    body: q.body,
    option_a: q.option_a ?? '',
    option_b: q.option_b ?? '',
    option_c: q.option_c ?? '',
    option_d: q.option_d ?? '',
    correct_opt: (q.correct_opt?.toUpperCase() as 'A' | 'B' | 'C' | 'D') ?? 'A',
    marks: q.marks ?? 1,
  };
}

function QuestionFormFields({
  form,
  setForm,
}: {
  form: QuestionForm;
  setForm: (f: QuestionForm) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label>Question *</Label>
        <Textarea
          value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
          rows={3}
          placeholder="Enter the question text…"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {(['A', 'B', 'C', 'D'] as const).map((opt) => {
          const key = `option_${opt.toLowerCase()}` as keyof QuestionForm;
          const isCorrect = form.correct_opt === opt;
          return (
            <div key={opt} className="flex flex-col gap-1.5">
              <Label className="flex items-center gap-1.5">
                Option {opt}
                {isCorrect ? (
                  <Badge variant="default" className="text-[10px] py-0 h-4">
                    Correct
                  </Badge>
                ) : null}
              </Label>
              <Input
                value={form[key] as string}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                placeholder={`Option ${opt}…`}
              />
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap items-end gap-6">
        <div className="flex flex-col gap-1.5">
          <Label>Correct answer</Label>
          <div className="flex gap-2">
            {(['A', 'B', 'C', 'D'] as const).map((opt) => (
              <Button
                key={opt}
                type="button"
                size="sm"
                variant={form.correct_opt === opt ? 'default' : 'outline'}
                onClick={() => setForm({ ...form, correct_opt: opt })}
                className="w-9"
              >
                {opt}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Marks</Label>
          <Input
            type="number"
            min="1"
            className="w-20"
            value={String(form.marks)}
            onChange={(e) =>
              setForm({ ...form, marks: Math.max(1, Number(e.target.value) || 1) })
            }
          />
        </div>
      </div>
    </div>
  );
}

export function QuestionEditor({
  testId,
  initialQuestions,
}: {
  testId: number;
  initialQuestions: Question[];
}) {
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [addingNew, setAddingNew] = useState(false);
  const [newForm, setNewForm] = useState<QuestionForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<QuestionForm>(EMPTY_FORM);
  const [isPending, startTransition] = useTransition();

  function startAdd() {
    setAddingNew(true);
    setNewForm(EMPTY_FORM);
    setEditingId(null);
  }

  function cancelAdd() {
    setAddingNew(false);
    setNewForm(EMPTY_FORM);
  }

  function startEdit(q: Question) {
    setEditingId(q.id);
    setEditForm(formFromQuestion(q));
    setAddingNew(false);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  function saveNew() {
    if (!newForm.body.trim()) {
      toast.error('Question text is required');
      return;
    }
    startTransition(async () => {
      const client = browserClient();
      const { data, error } = await client.POST('/tests/{test_id}/questions' as never, {
        params: { path: { test_id: testId } },
        body: {
          body: newForm.body.trim(),
          option_a: newForm.option_a || null,
          option_b: newForm.option_b || null,
          option_c: newForm.option_c || null,
          option_d: newForm.option_d || null,
          correct_opt: newForm.correct_opt,
          marks: newForm.marks,
        } as never,
      } as never);
      if (error) {
        toast.error('Failed to add question');
        return;
      }
      toast.success('Question added');
      setQuestions((prev) => [...prev, data as Question]);
      setAddingNew(false);
      setNewForm(EMPTY_FORM);
    });
  }

  function saveEdit() {
    if (editingId === null) return;
    if (!editForm.body.trim()) {
      toast.error('Question text is required');
      return;
    }
    startTransition(async () => {
      const client = browserClient();
      const { data, error } = await client.PUT(
        '/tests/{test_id}/questions/{question_id}' as never,
        {
          params: { path: { test_id: testId, question_id: editingId } },
          body: {
            body: editForm.body.trim(),
            option_a: editForm.option_a || null,
            option_b: editForm.option_b || null,
            option_c: editForm.option_c || null,
            option_d: editForm.option_d || null,
            correct_opt: editForm.correct_opt,
            marks: editForm.marks,
          } as never,
        } as never,
      );
      if (error) {
        toast.error('Failed to update question');
        return;
      }
      toast.success('Question updated');
      setQuestions((prev) =>
        prev.map((q) => (q.id === editingId ? (data as Question) : q)),
      );
      setEditingId(null);
    });
  }

  function deleteQuestion(questionId: number) {
    if (!window.confirm('Delete this question?')) return;
    startTransition(async () => {
      const client = browserClient();
      const { error } = await client.DELETE(
        '/tests/{test_id}/questions/{question_id}' as never,
        {
          params: { path: { test_id: testId, question_id: questionId } },
        } as never,
      );
      if (error) {
        toast.error('Failed to delete question');
        return;
      }
      toast.success('Question deleted');
      setQuestions((prev) => prev.filter((q) => q.id !== questionId));
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {questions.length === 0 && !addingNew ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No questions yet. Add the first one below.
        </p>
      ) : null}

      <div className="flex flex-col gap-3">
        {questions.map((q, idx) => (
          <div key={q.id}>
            {editingId === q.id ? (
              <div className="flex flex-col gap-4 rounded-lg border p-4">
                <div className="text-sm font-medium text-muted-foreground">
                  Editing Q{idx + 1}
                </div>
                <QuestionFormFields form={editForm} setForm={setEditForm} />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={cancelEdit} disabled={isPending}>
                    <X className="size-3.5" />
                    Cancel
                  </Button>
                  <Button size="sm" onClick={saveEdit} disabled={isPending}>
                    {isPending ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Check className="size-3.5" />
                    )}
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 rounded-lg border p-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">
                      Q{idx + 1}
                    </span>
                    <Badge variant="outline" className="h-4 py-0 text-[10px]">
                      {q.marks ?? 1} pt
                    </Badge>
                    {q.correct_opt ? (
                      <Badge variant="secondary" className="h-4 py-0 text-[10px]">
                        Correct: {q.correct_opt.toUpperCase()}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-sm font-medium">{q.body}</p>
                  <div className="mt-1.5 grid gap-1 sm:grid-cols-2">
                    {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                      const val = q[
                        `option_${opt.toLowerCase()}` as keyof Question
                      ] as string | null;
                      if (!val) return null;
                      const isCorrect = q.correct_opt?.toUpperCase() === opt;
                      return (
                        <div
                          key={opt}
                          className={`flex items-center gap-1 text-xs ${
                            isCorrect
                              ? 'font-medium text-green-600 dark:text-green-400'
                              : 'text-muted-foreground'
                          }`}
                        >
                          <span className="font-bold">{opt}.</span>
                          <span>{val}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => startEdit(q)}
                    disabled={isPending}
                    aria-label="Edit question"
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-destructive hover:text-destructive"
                    onClick={() => deleteQuestion(q.id)}
                    disabled={isPending}
                    aria-label="Delete question"
                  >
                    {isPending ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="size-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {addingNew ? (
        <div className="flex flex-col gap-4 rounded-lg border border-dashed p-4">
          <div className="text-sm font-medium">New question</div>
          <QuestionFormFields form={newForm} setForm={setNewForm} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={cancelAdd} disabled={isPending}>
              <X className="size-3.5" />
              Cancel
            </Button>
            <Button size="sm" onClick={saveNew} disabled={isPending}>
              {isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Plus className="size-3.5" />
              )}
              Add question
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          onClick={startAdd}
          className="self-start"
          disabled={isPending}
        >
          <Plus className="size-3.5" />
          Add question
        </Button>
      )}
    </div>
  );
}
