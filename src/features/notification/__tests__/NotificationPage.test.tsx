import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../../test/test-utils';
import { NotificationPage } from '../NotificationPage';
import { Notification } from '../../../lib/types/api';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

const { mockList, mockGetUnreadCount, mockMarkAsRead, mockMarkAllAsRead } = vi.hoisted(() => ({
  mockList: vi.fn(),
  mockGetUnreadCount: vi.fn(),
  mockMarkAsRead: vi.fn(),
  mockMarkAllAsRead: vi.fn(),
}));

vi.mock('../../../api', () => ({
  notificationApi: {
    list: (...args: unknown[]) => mockList(...args),
    getUnreadCount: (...args: unknown[]) => mockGetUnreadCount(...args),
    markAsRead: (...args: unknown[]) => mockMarkAsRead(...args),
    markAllAsRead: (...args: unknown[]) => mockMarkAllAsRead(...args),
    subscribePush: vi.fn(),
    unsubscribePush: vi.fn(),
  },
}));

const NOW = new Date('2026-07-25T12:00:00.000Z').getTime();

function makeNotification(overrides: Partial<Notification> & { type: string }): Notification {
  return {
    id: 1,
    userId: 'user-1',
    type: 'SYSTEM',
    title: 'Test Notification',
    body: 'Test body',
    channel: 'EMAIL',
    isRead: false,
    createdAt: new Date(NOW).toISOString(),
    ...overrides,
  };
}

describe('NotificationPage', () => {
  let dateNowSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUnreadCount.mockResolvedValue(0);
    dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(NOW);
  });

  afterEach(() => {
    dateNowSpy.mockRestore();
  });

  describe('getTimeAgo (via rendered time strings)', () => {
    it('should show "Just now" for < 1 minute ago', async () => {
      mockList.mockResolvedValue({
        data: [makeNotification({ createdAt: new Date(NOW - 30_000).toISOString() })],
        total: 1,
      });

      render(<NotificationPage />);
      await waitFor(() => {
        expect(screen.getByText('Just now')).toBeInTheDocument();
      });
    });

    it('should show "Xm ago" for minutes (< 60 min)', async () => {
      mockList.mockResolvedValue({
        data: [makeNotification({ createdAt: new Date(NOW - 15 * 60_000).toISOString() })],
        total: 1,
      });

      render(<NotificationPage />);
      await waitFor(() => {
        expect(screen.getByText('15m ago')).toBeInTheDocument();
      });
    });

    it('should show "Xh ago" for hours (< 24h)', async () => {
      mockList.mockResolvedValue({
        data: [makeNotification({ createdAt: new Date(NOW - 6 * 3_600_000).toISOString() })],
        total: 1,
      });

      render(<NotificationPage />);
      await waitFor(() => {
        expect(screen.getByText('6h ago')).toBeInTheDocument();
      });
    });

    it('should show "Xd ago" for days (< 7 days)', async () => {
      mockList.mockResolvedValue({
        data: [makeNotification({ createdAt: new Date(NOW - 3 * 86_400_000).toISOString() })],
        total: 1,
      });

      render(<NotificationPage />);
      await waitFor(() => {
        expect(screen.getByText('3d ago')).toBeInTheDocument();
      });
    });

    it('should show formatted date for >= 7 days', async () => {
      const oldDate = new Date(NOW - 10 * 86_400_000);
      mockList.mockResolvedValue({
        data: [makeNotification({ createdAt: oldDate.toISOString() })],
        total: 1,
      });

      render(<NotificationPage />);
      await waitFor(() => {
        const dateStr = oldDate.toLocaleDateString();
        expect(screen.getByText(dateStr)).toBeInTheDocument();
      });
    });

    it('should show "1m ago" at exactly 60 seconds', async () => {
      mockList.mockResolvedValue({
        data: [makeNotification({ createdAt: new Date(NOW - 60_000).toISOString() })],
        total: 1,
      });

      render(<NotificationPage />);
      await waitFor(() => {
        expect(screen.getByText('1m ago')).toBeInTheDocument();
      });
    });

    it('should show "1h ago" at exactly 60 minutes', async () => {
      mockList.mockResolvedValue({
        data: [makeNotification({ createdAt: new Date(NOW - 60 * 60_000).toISOString() })],
        total: 1,
      });

      render(<NotificationPage />);
      await waitFor(() => {
        expect(screen.getByText('1h ago')).toBeInTheDocument();
      });
    });
  });

  describe('getNotificationLink (via click navigation)', () => {
    const renderAndClick = async (notification: Notification) => {
      mockList.mockResolvedValue({ data: [notification], total: 1 });
      mockMarkAsRead.mockResolvedValue(notification);
      render(<NotificationPage />);
      await waitFor(() => {
        expect(screen.getByText(notification.title)).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText(notification.title));
    };

    it('should navigate to /consultation/:id for CONSULTATION_REQUEST', async () => {
      await renderAndClick(
        makeNotification({
          type: 'CONSULTATION_REQUEST',
          title: 'New Request',
          data: { consultationId: 'c-123' },
        }),
      );
      expect(mockNavigate).toHaveBeenCalledWith('/consultation/c-123');
    });

    it('should navigate to /consultation/:id for DOCTOR_DECISION', async () => {
      await renderAndClick(
        makeNotification({
          type: 'DOCTOR_DECISION',
          title: 'Decision Made',
          data: { consultationId: 'c-456' },
        }),
      );
      expect(mockNavigate).toHaveBeenCalledWith('/consultation/c-456');
    });

    it('should not navigate when CONSULTATION_REQUEST has no consultationId', async () => {
      await renderAndClick(
        makeNotification({
          type: 'CONSULTATION_REQUEST',
          title: 'No ID Request',
          data: {},
        }),
      );
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should navigate to /chat/:id for NEW_CHAT_MESSAGE', async () => {
      await renderAndClick(
        makeNotification({
          type: 'NEW_CHAT_MESSAGE',
          title: 'New Message',
          data: { chatId: 'chat-789' },
        }),
      );
      expect(mockNavigate).toHaveBeenCalledWith('/chat/chat-789');
    });

    it('should not navigate when NEW_CHAT_MESSAGE has no chatId', async () => {
      await renderAndClick(
        makeNotification({
          type: 'NEW_CHAT_MESSAGE',
          title: 'No Chat ID',
          data: {},
        }),
      );
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should navigate to /appointments for APPOINTMENT_REMINDER', async () => {
      await renderAndClick(
        makeNotification({
          type: 'APPOINTMENT_REMINDER',
          title: 'Upcoming Appointment',
        }),
      );
      expect(mockNavigate).toHaveBeenCalledWith('/appointments');
    });

    it('should navigate to /appointments for APPOINTMENT_CANCELLED', async () => {
      await renderAndClick(
        makeNotification({
          type: 'APPOINTMENT_CANCELLED',
          title: 'Cancelled',
        }),
      );
      expect(mockNavigate).toHaveBeenCalledWith('/appointments');
    });

    it('should navigate to /ai/:conversationId for SOAP_READY with conversationId', async () => {
      await renderAndClick(
        makeNotification({
          type: 'SOAP_READY',
          title: 'SOAP Ready',
          data: { conversationId: 'conv-1' },
        }),
      );
      expect(mockNavigate).toHaveBeenCalledWith('/ai/conv-1');
    });

    it('should navigate to /patient/soaps for SOAP_READY without conversationId', async () => {
      await renderAndClick(
        makeNotification({
          type: 'SOAP_READY',
          title: 'SOAP Ready No Conv',
          data: {},
        }),
      );
      expect(mockNavigate).toHaveBeenCalledWith('/patient/soaps');
    });

    it('should navigate to /doctor/workspace for DOCTOR_VERIFIED', async () => {
      await renderAndClick(
        makeNotification({
          type: 'DOCTOR_VERIFIED',
          title: 'Verified',
        }),
      );
      expect(mockNavigate).toHaveBeenCalledWith('/doctor/workspace');
    });

    it('should navigate to /doctor/workspace for NEW_REVIEW', async () => {
      await renderAndClick(
        makeNotification({
          type: 'NEW_REVIEW',
          title: 'New Review',
        }),
      );
      expect(mockNavigate).toHaveBeenCalledWith('/doctor/workspace');
    });

    it('should not navigate for SYSTEM notification (no link)', async () => {
      await renderAndClick(
        makeNotification({
          type: 'SYSTEM',
          title: 'System Notice',
        }),
      );
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should not navigate for PAYMENT_CONFIRMED (no link mapped)', async () => {
      await renderAndClick(
        makeNotification({
          type: 'PAYMENT_CONFIRMED',
          title: 'Payment OK',
        }),
      );
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
