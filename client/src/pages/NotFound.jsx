import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

export default function NotFound() {
  useDocumentTitle('Page not found');
  return (
    <div className="fatal">
      <Compass size={40} aria-hidden="true" />
      <h1>Page not found</h1>
      <p>The page you’re looking for doesn’t exist or has moved.</p>
      <div className="fatal__actions">
        <Link to="/dashboard" className="btn btn--primary">
          Go to dashboard
        </Link>
        <Link to="/" className="btn btn--ghost">
          Home
        </Link>
      </div>
    </div>
  );
}
