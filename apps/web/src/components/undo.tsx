// "Undo" for the important steps (collect, send to pharmacy, register, start a visit, order a lab test, complete
// a lab result): the step waits 5 seconds with a toast and an Undo button before it is sent to the server.
// Undo in that time = nothing happened. Nothing is ever reversed on the server: it was simply never sent.
import { useEffect, useState } from 'react';
import { toast } from '@platform/ui';

export const UNDO_SECONDS = 5;

/** Thrown (instead of the result) when Undo was pressed. Callers ignore it: see isUndone. */
export class Undone extends Error {
  constructor(what: string) {
    super(`${what}: undone. Nothing was saved.`);
    this.name = 'Undone';
  }
}
export const isUndone = (e: unknown): e is Undone => e instanceof Undone;

/**
 * Inside the toast: "Saving in 5 s" counting down, and a line that shrinks to nothing in the same time.
 * Only this part redraws each second; the toast and its Undo button stay still, so Undo is easy to hit.
 */
function Countdown() {
  const [left, setLeft] = useState(UNDO_SECONDS);
  const [go, setGo] = useState(false);
  useEffect(() => {
    const start = requestAnimationFrame(() => setGo(true));
    const t = setInterval(() => setLeft((x) => Math.max(1, x - 1)), 1000);
    return () => {
      cancelAnimationFrame(start);
      clearInterval(t);
    };
  }, []);
  return (
    <span className="block">
      <span className="block">
        Saving in <b className="tabular-nums">{left}</b> s. Pressed by mistake? Press Undo.
      </span>
      <span className="mt-2 block h-1 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/15">
        <span className="block h-full rounded-full bg-[var(--color-primary)] ease-linear" style={{ width: go ? '0%' : '100%', transition: `width ${UNDO_SECONDS}s linear` }} />
      </span>
    </span>
  );
}

/** Runs `send` after UNDO_SECONDS unless Undo is pressed on the toast. `what`: "Collecting Rs 500 from Kavitha". */
export function withUndo<T>(what: string, send: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let done = false;
    const id = `undo-${Math.random().toString(36).slice(2)}`;
    toast.loading(what, {
      id,
      description: <Countdown />,
      duration: Infinity,
      action: {
        label: 'Undo',
        onClick: () => {
          if (done) return;
          done = true;
          clearTimeout(timer);
          toast.info(`${what}: undone`, { id, description: 'Nothing was saved.', duration: 3000, action: undefined });
          reject(new Undone(what));
        },
      },
    });
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      toast.dismiss(id);
      send().then(resolve, reject);
    }, UNDO_SECONDS * 1000);
  });
}
