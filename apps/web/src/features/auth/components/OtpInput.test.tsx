import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { OtpInput } from './OtpInput';

function Harness({ onComplete }: { onComplete: (v: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <>
      <label htmlFor="otp">Code</label>
      <OtpInput id="otp" value={value} onChange={setValue} onComplete={onComplete} />
    </>
  );
}

describe('OtpInput', () => {
  it('accepts digits only and completes at six', async () => {
    const onComplete = vi.fn();
    render(<Harness onComplete={onComplete} />);
    const input = screen.getByLabelText('Code');
    expect(input).toHaveAttribute('autocomplete', 'one-time-code');
    await userEvent.type(input, '12a3 45');
    expect(input).toHaveValue('12345');
    expect(onComplete).not.toHaveBeenCalled();
    await userEvent.type(input, '67');
    expect(input).toHaveValue('123456');
    expect(onComplete).toHaveBeenCalledWith('123456');
  });

  it('accepts a pasted code with spaces', async () => {
    const onComplete = vi.fn();
    render(<Harness onComplete={onComplete} />);
    await userEvent.click(screen.getByLabelText('Code'));
    await userEvent.paste('482 913');
    expect(onComplete).toHaveBeenCalledWith('482913');
  });
});
