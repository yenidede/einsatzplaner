import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function SignupPage() {
  return (
    <div className="bg-secondary flex grow flex-col justify-end p-6 md:p-10">
      <div className="mb-8 grid w-full max-w-6xl gap-8 md:grid-cols-[minmax(0,30rem)_minmax(0,1fr)] md:items-end">
        <div className="space-y-6">
          <div className="space-y-3">
            <p className="text-muted-foreground text-sm font-medium tracking-[0.2em] uppercase">
              Anmeldung
            </p>
            <h1>Die Selbstregistrierung ist derzeit nicht verfuegbar</h1>
            <p className="text-muted-foreground">
              Wenn Sie bereits Zugriff haben, melden Sie sich bitte an. Falls
              Sie einen neuen Zugang benoetigen, kontaktieren Sie uns bitte
              direkt.
            </p>
          </div>
          <Button asChild>
            <Link href="/signin">Zur Anmeldung</Link>
          </Button>
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
