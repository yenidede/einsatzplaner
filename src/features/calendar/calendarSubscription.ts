import prisma from '@/lib/prisma'
import crypto from 'crypto'
import {generatedToken} from '@/lib/token'

export async function getOrCreateCalendarSubscription(orgId: string, userId: string,) {
    let existingCalendarSubscription = await prisma.calendar_subscription.findFirst({
        where: { org_id: orgId, user_id: userId, is_active: true }
    });
    if (existingCalendarSubscription) {
        return existingCalendarSubscription;
    }
    const organization = await prisma.organization.findUnique({
        where: { id: orgId},
        select: { name:true}
    });

    return prisma.calendar_subscription.create({
        data: {
            user_id: userId,
            org_id: orgId,
            token: generatedToken(24),
            name: organization?.name,
            is_active: true
        }
    })
}

export async function rotateCalendarSubscription(id: string){
    return prisma.calendar_subscription.update({
        where: {id},
        data: { token: generatedToken(24), is_active: true}
    })
}

export async function deactivateCalendarSubscription(id: string){
    return prisma.calendar_subscription.update({
        where: {id},
        data: { is_active: false}
    })
}

export function buildCalendarSubscriptionUrl(token: string) {
    return process.env.NEXTAUTH_URL?.replace(/^http/, "webcal") + `/api/calendar/${token}`;

}