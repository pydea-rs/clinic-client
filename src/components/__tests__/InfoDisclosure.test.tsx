import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '../../test/test-utils';
import { CollapsibleSection, InfoTip } from '../InfoDisclosure';

describe('InfoDisclosure components', () => {
  it('toggles CollapsibleSection aria-expanded state smoothly', () => {
    render(
      <CollapsibleSection title="Workflow details" subtitle="Step breakdown">
        <p>Detailed explanation content</p>
      </CollapsibleSection>,
    );

    const toggle = screen.getByRole('button', { name: /workflow details/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Detailed explanation content')).toBeInTheDocument();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens InfoTip dialog on click and closes on Escape key', () => {
    render(
      <InfoTip label="Match criteria info">
        <span>Match explanation text</span>
      </InfoTip>,
    );

    const button = screen.getByRole('button', { name: 'Match criteria info' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(button);
    expect(screen.getByRole('dialog', { name: 'Match criteria info' })).toBeInTheDocument();
    expect(screen.getByText('Match explanation text')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
