import { AppShell } from './components/layout/AppShell';
import { Logo } from './components/layout/Logo';
import { useStore } from './store/AppStore';
import { useHashRouter } from './lib/router';
import { TodayPage } from './pages/Today';
import { PlanPage } from './pages/Plan';
import { RecipesPage } from './pages/Recipes';
import { ProgressPage } from './pages/Progress';
import { ShoppingPage } from './pages/Shopping';
import { ProfilePage } from './pages/Profile';
import { AssistantPage } from './pages/Assistant';
import { ActivityPage } from './pages/Activity';
import { Onboarding } from './pages/Onboarding';

export default function App() {
  const { data, ready, saveError, storageAvailable } = useStore();
  const { route, params } = useHashRouter();

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center" aria-busy="true" aria-label="Cargando">
        <div className="anim-shimmer"><Logo size={56} /></div>
      </div>
    );
  }

  if (!data) return <Onboarding />;

  return (
    <AppShell route={route}>
      {(saveError || !storageAvailable) && (
        <div role="alert" className="mb-4 rounded-[14px] bg-danger/10 px-4 py-2.5 text-[14px] text-danger">
          {saveError ?? 'Este navegador no permite guardar datos (modo privado o almacenamiento bloqueado). Los cambios se perderán al cerrar la página.'}
        </div>
      )}
      {route === 'hoy' && <TodayPage dateParam={params.get('d')} />}
      {route === 'plan' && <PlanPage dateParam={params.get('d')} />}
      {route === 'progreso' && <ProgressPage />}
      {route === 'compra' && <ShoppingPage weekParam={params.get('w')} />}
      {route === 'perfil' && <ProfilePage section={params.get('s')} />}
      {route === 'asistente' && <AssistantPage />}
      {route === 'actividad' && <ActivityPage weekParam={params.get('w')} />}
      {route === 'recetas' && <RecipesPage />}
    </AppShell>
  );
}
