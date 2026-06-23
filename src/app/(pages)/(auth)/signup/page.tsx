import Image from 'next/image';
import { AuthScrollLock } from '@/app/(pages)/(auth)/AuthScrollLock';
import { SelfSignupForm } from '@/features/auth/self-signup/SelfSignupForm';

export default function SignupPage() {
  return (
    <div className="h-dvh overflow-hidden bg-[#f7f6f3]">
      <AuthScrollLock />
      <div className="mx-auto box-border flex h-full min-h-0 w-full max-w-[1800px] items-stretch gap-4 p-4 md:p-8 md:py-12">
        <aside className="bg-secondary/50 hidden h-full w-full max-w-[32rem] min-w-0 md:flex md:flex-[0.55]">
          <div className="h-full w-full overflow-hidden rounded-lg">
            <Image
              src="https://fgxvzejucaxteqvnhojt.supabase.co/storage/v1/object/public/images/signup2.jpg"
              alt="Sehr schönes Museum mit altem Gemälde"
              width={3840}
              height={2418}
              className="h-full w-full object-cover"
              priority
            />
          </div>
        </aside>
        <main className="flex min-h-0 min-w-0 flex-1 items-stretch justify-end">
          <div className="h-full min-h-0 w-full max-w-[70rem]">
            <SelfSignupForm />
          </div>
        </main>
      </div>
    </div>
  );
}
