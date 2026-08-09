import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

/** Top-level layout: Navbar + padded Bootstrap container for all pages. */
export default function PageShell() {
  return (
    <>
      <Navbar />
      <main className="container pb-5">
        <Outlet />
      </main>
    </>
  );
}
