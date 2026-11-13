import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="page-section">
      <div className="empty-state">
        <h2>Page not found</h2>
        <p>The page you requested does not exist.</p>
        <Link className="btn btn-primary" to="/">Return home</Link>
      </div>
    </div>
  );
}
