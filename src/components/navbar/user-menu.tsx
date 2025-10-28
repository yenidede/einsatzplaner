'use client'

import {
  BoltIcon,
  BookOpenIcon,
  Layers2Icon,
  LogOutIcon,
  PinIcon,
  UserPenIcon,
} from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { useSession } from "next-auth/react"
import { signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useSessionSync } from "@/hooks/useSessionSync"
import { getUserByIdWithOrgAndRole } from "@/DataAccessLayer/user"

export default function UserMenu() {
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
  if (status === "unauthenticated" ) {
    return (
      <Button
        variant="ghost"
        className="h-auto p-0 hover:bg-transparent"
        onClick={() => router.push("/signin")}
      >
      </Button>
    );
  }

  const user = session?.user;
  
  if(!user) {
    return null;
  }
  const handleLogout = async () => {
    await signOut({ callbackUrl: '/signin' });
  }
  
  const initials = `${user?.firstname?.charAt(0) ?? ''}${user?.lastname?.charAt(0) ?? ''}`.toUpperCase();
  const handleSettings = () => {
    router.push("/settings");
  }

  return ( 

    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-auto p-0 hover:bg-transparent">
          <Avatar>
            {
              user?.picture_url && <AvatarImage src={user.picture_url} alt={`Profile image for ${user.firstname} ${user.lastname}`} />
            }
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="max-w-64" align="end">
        <DropdownMenuLabel className="flex min-w-0 flex-col">
          <span className="text-foreground truncate text-sm font-medium">
            {user.firstname && user.lastname
              ? `${user.firstname} ${user.lastname}`
              : user?.email}
          </span>
          <span className="text-muted-foreground truncate text-xs font-normal">
            {user?.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={handleSettings}>
            <BoltIcon size={16} className="opacity-60" aria-hidden="true" />
            <span>Einstellungen</span>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Layers2Icon size={16} className="opacity-60" aria-hidden="true" />
            <span>Option 2</span>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <BookOpenIcon size={16} className="opacity-60" aria-hidden="true" />
            <span>Option 3</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
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
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
