import React, { act } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, Root } from 'react-dom/client';
import { Button } from '../src/components/ui/Button';
import { Drawer } from '../src/components/ui/Drawer';
import { ToastProvider, useToast } from '../src/components/ui/Toast';
import { EmptyState } from '../src/components/ui/EmptyState';

describe('Design System UI Components', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root?.unmount();
      });
    }
    if (container && document.body.contains(container)) {
      document.body.removeChild(container);
    }
    container = null;
    root = null;
  });

  // 1. Button Variants
  describe('Button component', () => {
    it('renders with variants: primary, secondary, ghost, danger', () => {
      const variants = ['primary', 'secondary', 'ghost', 'danger'] as const;
      variants.forEach((v) => {
        act(() => {
          root?.render(<Button variant={v}>{v} button</Button>);
        });
        const btn = container?.querySelector('button');
        expect(btn?.className).toContain(`ui-btn-${v}`);
      });
    });

    it('handles loading state with spinner and disabled attribute', () => {
      act(() => {
        root?.render(<Button isLoading>Submit</Button>);
      });
      const btn = container?.querySelector('button');
      expect(btn?.hasAttribute('disabled')).toBe(true);
      expect(btn?.getAttribute('aria-busy')).toBe('true');
      expect(container?.querySelector('.ui-btn-spinner')).not.toBeNull();
    });
  });

  // 2. EmptyState Rendering
  describe('EmptyState component', () => {
    it('renders title, description, and primary/secondary actions', () => {
      const handleAction = vi.fn();
      act(() => {
        root?.render(
          <EmptyState
            title="No Items Found"
            description="Try modifying your active search filters."
            actionLabel="Reset Filters"
            onAction={handleAction}
          />
        );
      });

      expect(container?.textContent).toContain('No Items Found');
      expect(container?.textContent).toContain('Try modifying your active search filters.');

      const btn = container?.querySelector('button');
      expect(btn?.textContent).toContain('Reset Filters');
      act(() => {
        btn?.click();
      });
      expect(handleAction).toHaveBeenCalledTimes(1);
    });
  });

  // 3. Drawer Focus Trap and Escape Dismissal
  describe('Drawer component', () => {
    it('renders dialog, traps focus and handles Escape key', () => {
      const handleClose = vi.fn();
      act(() => {
        root?.render(
          <Drawer isOpen={true} onClose={handleClose} title="Panel Details">
            <button id="inside-btn-1">Inside 1</button>
            <button id="inside-btn-2">Inside 2</button>
          </Drawer>
        );
      });

      const dialog = document.querySelector('[role="dialog"]');
      expect(dialog).not.toBeNull();
      expect(dialog?.getAttribute('aria-modal')).toBe('true');

      // Test Escape dismissal
      act(() => {
        const escEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
        document.dispatchEvent(escEvent);
      });
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  // 4. Toast Timing and Auto-dismissal
  describe('Toast component and timing', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('displays toast and auto-dismisses after duration', () => {
      const TestConsumer = () => {
        const { showToast } = useToast();
        return (
          <button
            id="trigger-toast"
            onClick={() => showToast({ type: 'success', title: 'Action complete', duration: 2000 })}
          >
            Trigger
          </button>
        );
      };

      act(() => {
        root?.render(
          <ToastProvider>
            <TestConsumer />
          </ToastProvider>
        );
      });

      const triggerBtn = container?.querySelector('#trigger-toast') as HTMLButtonElement;
      act(() => {
        triggerBtn?.click();
      });

      expect(document.body.textContent).toContain('Action complete');

      // Fast-forward timers by 2100ms
      act(() => {
        vi.advanceTimersByTime(2100);
      });

      expect(document.body.querySelector('.ui-toast')).toBeNull();
    });
  });
});
