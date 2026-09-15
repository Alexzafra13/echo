import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DjModeChip } from './DjModeChip';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('DjModeChip', () => {
  it('muestra el estado y cambia al pulsar sin propagar el clic', () => {
    const onToggle = vi.fn();
    const onParentClick = vi.fn();

    render(
      <div onClick={onParentClick}>
        <DjModeChip active onToggle={onToggle} />
      </div>
    );

    const chip = screen.getByRole('button', { name: 'djMode.tooltipOn' });
    expect(chip).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(chip);

    expect(onToggle).toHaveBeenCalledWith(false);
    expect(onParentClick).not.toHaveBeenCalled();
  });

  it('usa el texto de ayuda del modo desactivado', () => {
    render(<DjModeChip active={false} onToggle={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'djMode.tooltipOff' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });
});
