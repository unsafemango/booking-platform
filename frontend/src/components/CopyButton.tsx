import { useEffect, useState } from 'react';
import Button from './Button.tsx';
import { useToast } from '../lib/toast.tsx';

export const COPIED_DURATION = 2000;

/**
 * Copies `text` to the clipboard and briefly reads "Copied". If the clipboard is unavailable
 * or blocked, a toast shows the text instead so it can be copied by hand.
 */
export default function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const { show } = useToast();

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), COPIED_DURATION);
    return () => window.clearTimeout(id);
  }, [copied]);

  async function copy() {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      show(`Couldn't copy to the clipboard. It's ${text}`, { tone: 'danger' });
    }
  }

  return (
    <>
      <Button variant="ghost" className="btn-small" onClick={copy}>
        {copied ? 'Copied' : label}
      </Button>
      <span role="status" className="sr-only">
        {copied ? `${text} copied` : ''}
      </span>
    </>
  );
}
