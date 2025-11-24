import { HttpError, InternalServerError } from "./errors";

type Ok<T> = { ok: true; data: T };
type Err = { ok: false; status: number; message: string; code?: string };

export async function actionWrapper<T>(fn: () => Promise<T>): Promise<Ok<T> | Err> {
    try {
        const data = await fn();
        return { ok: true, data };
    } catch (e: unknown) {
        if (e instanceof HttpError) {
            return {
                ok: false,
                status: e.status,
                message: e.message,
                code: e.code,
            };
        }
        const fallback = new InternalServerError();
        return {
            ok: false,
            status: fallback.status,
            message: fallback.message,
            code: fallback.code,
        };
    }
}