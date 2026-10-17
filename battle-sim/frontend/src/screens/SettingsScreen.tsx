import React from 'react';
import { useSettings, ThemeMode, FontSize } from '../context/SettingsContext';
import { Card, CardHeader, CardTitle, CardBody } from '../components/ui/Card';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';

export const SettingsScreen: React.FC = () => {
  const { theme, setTheme, reducedMotion, setReducedMotion, fontSize, setFontSize } = useSettings();
  const { success } = useToast();

  const handleSave = () => {
    success('Settings saved', 'Your preferences have been persisted to local storage.');
  };

  return (
    <div className="page-container" style={{ maxWidth: '800px' }}>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 className="text-h1">Preferences & Accessibility</h1>
        <p className="text-muted" style={{ marginTop: 'var(--space-1)' }}>
          Customize your display theme, typography scale, and animation behavior.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <Card>
          <CardHeader>
            <CardTitle>Appearance & Theme</CardTitle>
          </CardHeader>
          <CardBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <Select
                id="theme-select"
                label="Theme Mode"
                hint="Select between Dark, Light, or follow your OS system setting"
                value={theme}
                onChange={(e) => setTheme(e.target.value as ThemeMode)}
                options={[
                  { value: 'dark', label: 'Dark Mode (Default)' },
                  { value: 'light', label: 'Light Mode' },
                  { value: 'system', label: 'Match System Preference' },
                ]}
              />

              <Select
                id="font-size-select"
                label="Text Scaling"
                hint="Adjust the base reading size of labels, reports, and data tables"
                value={fontSize}
                onChange={(e) => setFontSize(e.target.value as FontSize)}
                options={[
                  { value: 'small', label: 'Compact / Small' },
                  { value: 'default', label: 'Standard (16px base)' },
                  { value: 'large', label: 'Large / Accessible' },
                ]}
              />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Motion & Accessibility</CardTitle>
          </CardHeader>
          <CardBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 'var(--font-weight-bold)' }}>Reduced Motion</div>
                  <div className="text-muted" style={{ fontSize: 'var(--font-size-small)' }}>
                    Disable combat shake, ticker animations, and arena projectile slides.
                  </div>
                </div>
                <Button
                  id="reduced-motion-toggle"
                  variant={reducedMotion ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setReducedMotion(!reducedMotion)}
                  aria-pressed={reducedMotion}
                >
                  {reducedMotion ? 'Enabled (No Motion)' : 'Disabled (Full Motion)'}
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
          <Button variant="primary" onClick={handleSave}>
            Save Preferences
          </Button>
        </div>
      </div>
    </div>
  );
};
