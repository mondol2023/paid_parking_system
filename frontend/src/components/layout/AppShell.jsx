import { Link, NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { LogOut, Moon, SquareParking, Sun, User } from 'lucide-react';
import { cn } from '@/lib/cn';
import { spring } from '@/lib/motion';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { navItems } from './navItems';

function Wordmark({ className }) {
  return (
    <Link to="/" className={cn('flex items-center gap-2', className)}>
      <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-ink">
        <SquareParking size={19} aria-hidden="true" />
      </span>
      <span className="font-display text-lg font-semibold tracking-tight text-ink">Parkline</span>
    </Link>
  );
}

function RailLink({ item, onNavigate }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
          isActive ? 'text-ink' : 'text-muted hover:bg-surface-2 hover:text-ink',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            // layoutId: the active marker slides between items rather than
            // blinking out of one and into the next.
            <motion.span
              layoutId="rail-active"
              transition={spring}
              className="absolute inset-0 rounded-lg border border-line bg-surface shadow-card"
            />
          )}
          <Icon size={17} aria-hidden="true" className="relative z-1 shrink-0" />
          <span className="relative z-1 font-medium">{item.label}</span>
        </>
      )}
    </NavLink>
  );
}

function TabLink({ item }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        cn(
          'relative flex flex-1 flex-col items-center gap-1 py-2 text-[11px] transition-colors',
          isActive ? 'text-ink' : 'text-muted',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              layoutId="tab-active"
              transition={spring}
              className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-accent"
            />
          )}
          <Icon size={19} aria-hidden="true" />
          <span className="font-medium">{item.short ?? item.label}</span>
        </>
      )}
    </NavLink>
  );
}

export function AppShell({ children }) {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  const signOut = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-dvh bg-ground">
      {/* Side rail — persistent from lg up. */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-ground px-3 py-5 lg:flex">
        <Wordmark className="px-2" />

        <nav aria-label="Main" className="mt-7 flex flex-col gap-1">
          {navItems.map((item) => (
            <RailLink key={item.to} item={item} />
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-1 border-t border-line pt-3">
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                isActive ? 'bg-surface text-ink' : 'text-muted hover:bg-surface-2 hover:text-ink',
              )
            }
          >
            <User size={17} aria-hidden="true" />
            <span className="truncate font-medium">{user?.username ?? 'Profile'}</span>
          </NavLink>
          <button
            type="button"
            onClick={signOut}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-alert"
          >
            <LogOut size={17} aria-hidden="true" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Top bar — the only chrome on mobile, a thin utility strip on desktop. */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-line bg-ground/85 px-4 backdrop-blur lg:pl-64">
        <Wordmark className="lg:hidden" />
        <span className="hidden text-xs text-muted lg:block">
          Signed in as <span className="font-medium text-ink">{user?.username}</span>
        </span>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={toggle}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            className="flex size-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            {theme === 'dark' ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}
          </button>
          <Link
            to="/profile"
            aria-label="Profile"
            className="flex size-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-ink lg:hidden"
          >
            <User size={17} aria-hidden="true" />
          </Link>
        </div>
      </header>

      <main className="lg:pl-60">
        <div className="mx-auto w-full max-w-[1200px] px-4 pb-28 pt-6 sm:px-6 lg:pb-12">{children}</div>
      </main>

      {/* Mobile tab bar. */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        {navItems.map((item) => (
          <TabLink key={item.to} item={item} />
        ))}
      </nav>
    </div>
  );
}
