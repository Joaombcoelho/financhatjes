import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    let enabled = false;
    try { enabled = localStorage.getItem('financhat:theme') === 'dark'; } catch { /* theme remains light */ }
    document.documentElement.classList.toggle('dark', enabled); setDark(enabled);
  }, []);
  function toggle() {
    const enabled = !dark;
    setDark(enabled); document.documentElement.classList.toggle('dark', enabled);
    try { localStorage.setItem('financhat:theme', enabled ? 'dark' : 'light'); } catch { /* session-only preference */ }
  }
  return <Button type="button" size="icon" variant="ghost" onClick={toggle} aria-pressed={dark} aria-label={dark ? 'Ativar tema claro' : 'Ativar tema escuro'} title={dark ? 'Ativar tema claro' : 'Ativar tema escuro'}>{dark ? <Sun /> : <Moon />}</Button>;
}