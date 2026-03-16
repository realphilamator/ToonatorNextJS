"use client";
import Link from "next/link";
import { useUsernameColor } from "@/hooks/color-username";
import { useUsernameIcon } from "@/hooks/nick-icon";

export default function UsernameLink({ username, className = "", ...props }) {
  const { colorClass, nickColor } = useUsernameColor(username);
  const { iconUrl } = useUsernameIcon(username);

  const style = {
    ...(nickColor ? { "--nick-color": nickColor } : {}),
    ...(iconUrl   ? { background: `url(${iconUrl}) no-repeat`, backgroundSize: "16px" } : {}),
  };

  return (
    <Link
      href={`/user/${encodeURIComponent(username)}`}
      className={[
        "username",
        colorClass,
        nickColor ? "has-nick-color" : "",
        iconUrl   ? "withicon"       : "",
        className,
      ].filter(Boolean).join(" ")}
      style={Object.keys(style).length ? style : undefined}
      {...props}
    >
      {username}
    </Link>
  );
}