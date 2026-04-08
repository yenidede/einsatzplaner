import Image from 'next/image';
import { SelfSignupForm } from '@/features/auth/self-signup/SelfSignupForm';

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-[#f7f6f3] px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto flex min-h-[80vh] w-full max-w-[1800px] items-start gap-8 lg:gap-12">
        <aside className="bg-secondary/50 hidden min-w-0 w-full max-w-[32rem] md:flex md:flex-[0.55]">
          <div className="h-[80vh] w-full overflow-hidden rounded-[2rem]">
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
        <main className="flex min-w-0 flex-1 items-start justify-end">
          <div className="w-full max-w-[70rem]">
            <SelfSignupForm />
          </div>
        </main>
      </div>
    </div>
  );
}
