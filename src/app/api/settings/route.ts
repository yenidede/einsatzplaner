import { NextResponse } from "next/server";
import { hash, compare } from "bcryptjs";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth"; // ✅ NEU
import { authOptions } from "../auth/[...nextauth]/route"; // ✅ NEU

type UserSettings = {
  firstname: any;
  lastname: any;
  email: string;
  picture_url: any;
  phone: string;
  hasLogoinCalendar: boolean;
  updated_at: Date;
};

// GET Handler für Userdaten
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId fehlt" }, { status: 400 });
  }

  // Lade User mit allen Organisationen und Rollen
  const userWithOrganizations = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      user_organization_role: {
        include: {
          organization: true,
          role: true
        }
      }
    }
  });

  if (!userWithOrganizations) {
    return NextResponse.json({ error: "User nicht gefunden" }, { status: 404 });
  }

  // Gruppiere Rollen nach Organisation
  const organizationsWithRoles = userWithOrganizations.user_organization_role.reduce((acc: any[], curr) => {
    const existingOrg = acc.find(org => org.id === curr.organization.id);

    const roleObj = {
      id: curr.role.id,
      name: curr.role.name,
      abbreviation: (curr.role as any).abbreviation ?? null
    };
    
    if (existingOrg) {
      existingOrg.roles.push(roleObj);
      existingOrg.userOrgRoleIds.push(curr.id);
    } else {
      acc.push({
        id: curr.organization.id,
        name: curr.organization.name,
        description: curr.organization.description,
        roles: [roleObj],
        userOrgRoleIds: [curr.id],
        hasGetMailNotification: curr.hasGetMailNotification || false
      });
    }
    
    return acc;
  }, []);

  const userData = {
    ...userWithOrganizations,
    organizations: organizationsWithRoles
  };

  return NextResponse.json(userData);
}

// POST Handler (für Kompatibilität)
export async function POST(req: Request) {
  return handleUserUpdate(req);
}

// DELETE Handler - User verlässt Organisation
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const orgId = searchParams.get("orgId");
    const userOrgRoleId = searchParams.get("userOrgRoleId");

    if (!userId || (!orgId && !userOrgRoleId)) {
      return NextResponse.json({ 
        error: "userId und (orgId oder userOrgRoleId) sind erforderlich" 
      }, { status: 400 });
    }

    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    
    if (!uuidRegex.test(userId)) {
      return NextResponse.json({ error: 'Ungültige userId Format' }, { status: 400 });
    }
    if (orgId && !uuidRegex.test(orgId)) {
      return NextResponse.json({ error: 'Ungültige orgId Format' }, { status: 400 });
    }
    if (userOrgRoleId && !uuidRegex.test(userOrgRoleId)) {
      return NextResponse.json({ error: 'Ungültige userOrgRoleId Format' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { user_organization_role: true }
    });

    if (!user) {
      return NextResponse.json({ error: "User nicht gefunden" }, { status: 404 });
    }

    if (user.user_organization_role.length <= 1) {
      return NextResponse.json({ 
        error: "Sie können die letzte Organisation nicht verlassen" 
      }, { status: 400 });
    }

    let deleteCondition: any;
    if (userOrgRoleId) {
      deleteCondition = { id: userOrgRoleId };
    } else {
      deleteCondition = { 
        user_id: userId, 
        organization_id: orgId
      };
    }

    const deletedRelation = await prisma.user_organization_role.deleteMany({
      where: deleteCondition
    });

    if (deletedRelation.count === 0) {
      return NextResponse.json({ 
        error: "Organisation-Zuordnung nicht gefunden" 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: "Organisation erfolgreich verlassen",
      deletedCount: deletedRelation.count,
      trigger: 'refetch' // ✅ NEU: Session Trigger
    });

  } catch (error) {
    console.error("DELETE Error:", error);
    return NextResponse.json({ 
      error: "Fehler beim Verlassen der Organisation" 
    }, { status: 500 });
  }
}

// PUT Handler
export async function PUT(req: Request) {
  try {
    // ✅ Session Check
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { 
      userId, 
      userOrgId, 
      orgId, 
      email, 
      firstname, 
      lastname, 
      hasLogoinCalendar, 
      hasGetMailNotification, 
      picture_url,
      phone 
    } = body;
    
    if (!userId) {
      return NextResponse.json({ error: "Benutzer-ID fehlt" }, { status: 400 });
    }

    // ✅ Authorization: Nur eigenes Profil editieren (oder Admin)
    if (session.user.id !== userId) {
      // TODO: Add admin check
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ✅ User Update
    const updateUserData: Partial<UserSettings> = {
      updated_at: new Date(),
    };

    // Only update fields that are provided
    if (email !== undefined) updateUserData.email = email;
    if (firstname !== undefined) updateUserData.firstname = firstname;
    if (lastname !== undefined) updateUserData.lastname = lastname;
    if (phone !== undefined) updateUserData.phone = phone;
    if (hasLogoinCalendar !== undefined) updateUserData.hasLogoinCalendar = hasLogoinCalendar;
    if (picture_url !== undefined) updateUserData.picture_url = picture_url;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateUserData,
      select: {
        id: true,
        email: true,
        firstname: true,
        lastname: true,
        phone: true,
        picture_url: true,
        hasLogoinCalendar: true,
      }
    });

    // ✅ Organization Notification Settings
    if (orgId && hasGetMailNotification !== undefined) {
      await prisma.user_organization_role.updateMany({
        where: { 
          user_id: userId, 
          org_id: orgId 
        },
        data: { 
          hasGetMailNotification: hasGetMailNotification 
        }
      });
    }

    console.log("✅ User updated:", {
      userId,
      email: updatedUser.email,
      firstname: updatedUser.firstname,
      lastname: updatedUser.lastname,
      picture_url: updatedUser.picture_url,
    });

    // ✅ Return updated data + session trigger
    return NextResponse.json({ 
      success: true, 
      message: "Profil erfolgreich aktualisiert",
      user: updatedUser, 
    });

  } catch (error) {
    console.error("❌ API Error (PUT):", error);
    return NextResponse.json({ 
      error: "Profil-Update fehlgeschlagen",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Gemeinsame Handler-Funktion für POST
async function handleUserUpdate(req: Request) {
  try {
    // ✅ Session Check
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { userId, email, firstname, lastname, currentPassword, newPassword, picture_url } = body;

    if (!userId) {
      return NextResponse.json({ error: "Benutzer-ID fehlt" }, { status: 400 });
    }

    // ✅ Authorization
    if (session.user.id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const currentUser = await prisma.user.findUnique({ 
      where: { id: userId },
      select: {
        id: true,
        email: true,  
        firstname: true,
        lastname: true,
        password: true,
        picture_url: true,
      }
    });

    if (!currentUser) {
      return NextResponse.json({ error: "Benutzer nicht gefunden" }, { status: 404 });
    }

    const updateData: any = {
      email: email || currentUser.email,
      firstname: firstname || currentUser.firstname,
      lastname: lastname || currentUser.lastname,
      updated_at: new Date(),
      picture_url: picture_url !== undefined ? picture_url : currentUser.picture_url,
    };

    // ✅ Password Update
    if (newPassword && currentPassword) {
      const isValidPassword = await compare(currentPassword, currentUser.password);
      
      if (!isValidPassword) {
        return NextResponse.json({ 
          error: "Aktuelles Passwort ist falsch" 
        }, { status: 400 });
      }
      
      updateData.password = await hash(newPassword, 12);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstname: true,
        lastname: true,
        picture_url: true,
      }
    });

    console.log("✅ User updated:", updatedUser);

    // ✅ Return with session trigger
    return NextResponse.json({
      success: true,
      message: "Profil erfolgreich aktualisiert",
      user: updatedUser, // ✅ NEU
      trigger: 'refetch' // ✅ NEU
    });

  } catch (error) {
    console.error("❌ API Error:", error);
    return NextResponse.json({
      success: false,
      error: "Profil-Update fehlgeschlagen",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}