import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  // Don't render on landing page
  if (pathnames.length === 0) {
    return null;
  }

  const routeNames: Record<string, string> = {
    scenarios: 'Scenarios',
    battles: 'Battles',
    report: 'Battle Report',
    plan: 'Battle Plan',
    author: 'Scenario Author',
    data: 'Data & Uploads',
    settings: 'Settings',
  };

  return (
    <nav aria-label="Breadcrumb" className="breadcrumbs">
      <Link to="/" className="breadcrumb-link">
        Home
      </Link>
      {pathnames.map((segment, index) => {
        const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;
        const displayName = routeNames[segment] || segment.replace(/_/g, ' ');

        return (
          <span key={routeTo} className="breadcrumb-item">
            <span className="breadcrumb-separator" aria-hidden="true">/</span>
            {isLast ? (
              <span className="breadcrumb-current" aria-current="page">
                {displayName}
              </span>
            ) : (
              <Link to={routeTo} className="breadcrumb-link">
                {displayName}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
};
