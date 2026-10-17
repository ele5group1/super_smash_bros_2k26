import React from 'react';
import { Drawer } from '../ui/Drawer';

interface ShortcutHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutHelpModal: React.FC<ShortcutHelpModalProps> = ({ isOpen, onClose }) => {
  const shortcuts = [
    { key: '?', desc: 'Open keyboard shortcuts help' },
    { key: 'Ctrl + K / ⌘K', desc: 'Open Command Palette' },
    { key: 'Space', desc: 'Play / Pause battle replay' },
    { key: '← / →', desc: 'Step backward / forward one tick' },
    { key: 'Esc', desc: 'Close open dialogs or drawers' },
    { key: '1 - 4', desc: 'Select creature squad slot (in builder)' },
  ];

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Keyboard Shortcuts" width="460px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-small)' }}>
          Quick keyboard navigation for power users:
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {shortcuts.map((sc) => (
            <div key={sc.key} className="shortcut-row">
              <span style={{ fontSize: 'var(--font-size-small)', color: 'var(--text-primary)' }}>
                {sc.desc}
              </span>
              <kbd className="kbd-key">{sc.key}</kbd>
            </div>
          ))}
        </div>
      </div>
    </Drawer>
  );
};
