import { Link } from "react-router-dom";

function NotFound() {
  return (
    <section className="welcome-page">
      <h1>404</h1>
      <p>This page could not be found.</p>
      <Link to="/">Back to Home</Link>
    </section>
  );
}

export default NotFound;
