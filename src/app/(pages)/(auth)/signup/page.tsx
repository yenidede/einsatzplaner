import Image from 'next/image';
import { SelfServeSignupFlow } from '@/features/self-serve-signup/components/SelfServeSignupFlow';

export default function SignupPage() {
  return (
    <div className="bg-secondary flex grow flex-col justify-end p-6 md:p-10">
      <div className="mb-8 grid w-full max-w-6xl gap-8 md:grid-cols-[minmax(0,30rem)_minmax(0,1fr)] md:items-end">
        <div className="space-y-6">
          <div className="space-y-3">
            <p className="text-muted-foreground text-sm font-medium uppercase tracking-[0.2em]">
              Self-Serve Signup
            </p>
            <h1>Starten Sie mit Ihrer Organisation</h1>
            <p className="text-muted-foreground">
              Legen Sie zuerst die grundlegenden Organisationsdaten fest. Danach
              wird der weitere Flow passend zu Ihrem Kontostatus fortgesetzt.
            </p>
          </div>
          <SelfServeSignupFlow />
        </div>
        <div className="hidden md:block">
          <Image
            src="https://fgxvzejucaxteqvnhojt.supabase.co/storage/v1/object/public/images/signup.jpg"
            alt="Sehr schönes Museum mit altem Gemälde"
            width={3840}
            height={2418}
            className="aspect-[4/5] shrink rounded-3xl object-cover shadow-2xl"
          />
        </div>
      </div>
    </div>
  );
}
