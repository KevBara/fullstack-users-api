import UsersDashboard from '@/components/users-dashboard';

export default function HomePage() {
  return (
    <main className="page-shell">
      <div className="page-header">
        <p className="eyebrow">Fullstack Users API</p>
        <h1>Panel de administración de usuarios</h1>
      </div>
      <UsersDashboard />
    </main>
  );
}
