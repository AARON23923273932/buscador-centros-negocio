import type { ComponentProps, ReactNode } from 'react';
import { cn } from 'cn';
import { Radio } from '@base-ui/react/radio';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { RadioGroup } from '@/components/ui/radio-group';

export function GrupoOpciones({ className, children, ...props }: ComponentProps<typeof RadioGroup>) {
  return (
    <RadioGroup className={cn('w-fit', className)} {...props}>
      <ButtonGroup role="presentation" className="w-full">
        {children}
      </ButtonGroup>
    </RadioGroup>
  );
}

interface PropsOpcion {
  value: string;
  elegida: boolean;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}

export function OpcionBoton({ value, elegida, disabled, className, children }: PropsOpcion) {
  return (
    <Radio.Root value={value} disabled={disabled} nativeButton render={<Button type="button" variant={elegida ? 'default' : 'outline'} className={cn(elegida && 'shadow-[inset_0_-3px_0_0_var(--marca-naranja)]', className)} />}>
      {children}
    </Radio.Root>
  );
}
