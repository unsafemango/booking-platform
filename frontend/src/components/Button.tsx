import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'ghost' | 'danger';

const VARIANT_CLASS: Record<Variant, string> = {
  primary: 'btn',
  ghost: 'btn btn-ghost',
  danger: 'btn btn-ghost danger',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

// Defaults to type="button" so a button inside a form only submits when asked to.
export default function Button({
  variant = 'primary',
  type = 'button',
  className,
  ...props
}: ButtonProps) {
  const classes = className ? `${VARIANT_CLASS[variant]} ${className}` : VARIANT_CLASS[variant];
  return <button type={type} className={classes} {...props} />;
}
