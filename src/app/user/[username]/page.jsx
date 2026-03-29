import { getProfileByUsername, getProfileStats } from "@/lib/api";
import { notFound } from "next/navigation";
import ProfileClient from "./ProfileClient";

export async function generateMetadata({ params }) {
  const { username } = await params;
  const decoded = decodeURIComponent(username);
  return { title: `${decoded} - Toonator` };
}

export default async function UserPage({ params }) {
  console.log(`Loading profile page for ${params.username}`);
  const { username: rawUsername } = await params;
  const username = decodeURIComponent(rawUsername);

  const { profile, error } = await getProfileByUsername(username);
  if (!profile) notFound();

  const stats = await getProfileStats(profile.id);

  return (
    <ProfileClient
      username={username}
      profile={profile}
      stats={stats}
    />
  );
}