import { ProfileForm } from "@/components/ProfileForm";
import { getCurrentUserId } from "@/lib/auth";
import { getBusinessProfile } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const userId = await getCurrentUserId();
  const profile = userId ? await getBusinessProfile(userId) : null;

  return <ProfileForm profile={profile} />;
}
