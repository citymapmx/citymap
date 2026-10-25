// Controls UI visibility only. Server authorization must validate every action.
export function isAdminUser(user, profile) {
  if (!user?.id) return false;
  const email = user.email?.trim().toLowerCase();
  const profileMatches = profile?.id === user.id;
  return (profileMatches && profile.role === 'admin') || user.app_metadata?.isAdmin === true ||
    email === 'soporte@citymap.mx' || email === 'mendozadaniel1999@gmail.com';
}
