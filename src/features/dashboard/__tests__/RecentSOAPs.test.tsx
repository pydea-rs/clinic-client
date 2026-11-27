import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../../test/test-utils';
import { RecentSOAPs } from '../components/RecentSOAPs';

const { mockList } = vi.hoisted(() => ({
  mockList: vi.fn(),
}));

vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => <div>{children}</div>,
}));
vi.mock('remark-gfm', () => ({ default: () => {} }));

vi.mock('../../../api', () => ({
  soapApi: {
    list: (...args: unknown[]) => mockList(...args),
  },
}));

describe('RecentSOAPs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('links Find Doctor directly to /matching/request?soapId=... for dynamic SOAP entries', async () => {
    const soap1 = {
      id: crypto.randomUUID(),
      conversationId: crypto.randomUUID(),
      assessment: 'Acute ear infection symptoms',
      suggestedSpecialty: 'ENT',
      triageLevel: 'URGENT',
      createdAt: new Date().toISOString(),
    };
    const soap2 = {
      id: crypto.randomUUID(),
      conversationId: crypto.randomUUID(),
      subjective: 'Mild fatigue',
      createdAt: new Date().toISOString(),
    };

    mockList.mockResolvedValue({ data: [soap1, soap2], total: 2 });

    render(<RecentSOAPs />);

    const findLinks = await screen.findAllByRole('link', { name: /find doctor/i });
    expect(findLinks).toHaveLength(2);
    expect(findLinks[0]).toHaveAttribute('href', `/matching/request?soapId=${soap1.id}`);
    expect(findLinks[1]).toHaveAttribute('href', `/matching/request?soapId=${soap2.id}`);
  });
});
