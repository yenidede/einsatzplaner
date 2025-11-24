=> Server actions don't natively support HTTP ErrorCodes (like 404, 500, ...)

Server Actions with typed Result
Reference from dal-einsatz how to implement in a server action

- Keep actions, model “statuses” in the return value.

Example:

    // lib/result.ts
    export type Result<T> =
      | { ok: true; data: T }
      | { ok: false; status: number; message: string; code?: string };


    // lib/errors.ts
    export class HttpError extends Error {
      constructor(public status: number, message: string, public code?: string) {
        super(message);
      }
    }
    export class UnauthorizedError extends HttpError {
      constructor(msg = "Unauthorized") {
        super(401, msg, "UNAUTHORIZED");
      }
    }


    // app/actions.ts
    "use server";

    import { Result } from "@/lib/result";
    import { UnauthorizedError } from "@/lib/errors";
    import { getSession } from "@/lib/auth";

    export async function updateProfile(
      form: FormData
    ): Promise<Result<{ success: true }>> {
      try {
        const session = await getSession();
        if (!session) throw new UnauthorizedError();

        const name = form.get("name");
        if (!name || typeof name !== "string") {
          throw new HttpError(400, "Name is required", "BAD_REQUEST");
        }

        // ... update
        return { ok: true, data: { success: true } };
      } catch (e: any) {
        if (e instanceof HttpError) {
          return { ok: false, status: e.status, message: e.message, code: e.code };
        }
        return { ok: false, status: 500, message: "Internal Server Error" };
      }
    }

Client handling:

    // app/profile/page.tsx
    "use client";
    import { useTransition, useState } from "react";
    import { updateProfile } from "../actions";

    export default function ProfilePage() {
      const [error, setError] = useState<string | null>(null);
      const [isPending, startTransition] = useTransition();

      const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);

        startTransition(async () => {
          const res = await updateProfile(data);
          if (!res.ok) {
            if (res.status === 401) {
              // e.g., redirect to login
            }
            setError(`${res.status}: ${res.message}`);
            return;
          }
          setError(null);
          // success UI
        });
      };

      return (
        <form onSubmit={onSubmit}>
          <input name="name" placeholder="Name" />
          <button disabled={isPending}>Save</button>
          {error && <p>{error}</p>}
        </form>
      );
    }
