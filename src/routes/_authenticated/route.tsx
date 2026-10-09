import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppNav } from "@/components/finance/AppNav";
import { LocalImportPrompt } from "@/components/finance/LocalImportPrompt";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: Layout,
});

function Layout() {
  const { user } = Route.useRouteContext();
  return (
    <>
      <AppNav email={user.email ?? ""} name={(user.user_metadata?.["full_name"] as string | undefined) ?? ""} />
      <main className="mx-auto max-w-5xl px-4 pb-28 pt-6 md:pb-12">
        <LocalImportPrompt userId={user.id} />
        <Outlet />
      </main>
    </>
  );
}
