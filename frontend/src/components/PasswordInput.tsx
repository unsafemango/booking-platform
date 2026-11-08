import { useState, type ComponentProps } from 'react';
import Button from './Button.tsx';
import Input from './Input.tsx';

type PasswordInputProps = Omit<ComponentProps<typeof Input>, 'type' | 'action'>;

/** Password field with a button that shows or hides what was typed. Starts hidden. */
export default function PasswordInput(props: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <Input
      {...props}
      type={visible ? 'text' : 'password'}
      autoCapitalize="off"
      autoCorrect="off"
      spellCheck={false}
      action={
        <Button
          variant="ghost"
          className="btn-small input-action"
          aria-label={visible ? 'Hide password' : 'Show password'}
          onClick={() => setVisible(!visible)}
        >
          {visible ? 'Hide' : 'Show'}
        </Button>
      }
    />
  );
}
