"use client";

import {
  SettingsIcon,
  LogOutIcon,
  PinIcon,
  UserPenIcon,
  BuildingIcon,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";

import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useSessionSync } from "@/hooks/useSessionSync";
import { JSX } from "react";

export default function UserMenu(): JSX.Element | null {
  const { data: session, status } = useSession();
  const router = useRouter();

  useSessionSync();

  if (status === "loading") {
    return (
      <Button variant="ghost" className="h-auto p-0 hover:bg-transparent">
        <Avatar>
          <AvatarFallback></AvatarFallback>
        </Avatar>
      </Button>
    );
  }
  if (status === "unauthenticated") {
    return (
      <Button
        variant="ghost"
        className="h-auto p-0 hover:bg-transparent"
        onClick={() => router.push("/signin")}
      ></Button>
    );
  }

  if (session == null || !session.user) {
    router.push("/signin");
  }

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/signin" });
  };

  const initials = `${session?.user?.firstname?.charAt(0) ?? ""}${
    session?.user?.lastname?.charAt(0) ?? ""
  }`.toUpperCase();
  const handleSettings = () => {
    router.push("/settings");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-auto p-0 hover:bg-transparent">
          <Avatar>
            {session?.user?.picture_url && (
              <AvatarImage
                src={session.user.picture_url}
                alt={`Profile image for ${session.user.firstname} ${session.user.lastname}`}
              />
            )}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="max-w-64" align="end">
        <DropdownMenuLabel className="flex min-w-0 flex-col">
          <span className="text-foreground truncate text-sm font-medium">
            {session?.user.firstname && session.user.lastname
              ? `${session.user.firstname} ${session.user.lastname}`
              : session?.user?.email}
          </span>
          <span className="text-muted-foreground truncate text-xs font-normal">
            {session?.user?.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={handleSettings}>
            <SettingsIcon size={16} className="opacity-60" aria-hidden="true" />
            <span>Einstellungen</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Organisationen</DropdownMenuLabel>
          <DropdownMenuItem>
            <PinIcon size={16} className="opacity-60" aria-hidden="true" />
            <span>Option 4</span>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <UserPenIcon size={16} className="opacity-60" aria-hidden="true" />
            <span>Option 5</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOutIcon size={16} className="opacity-60" aria-hidden="true" />
          <span>Ausloggen</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
