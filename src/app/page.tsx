import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function Home() {
  return (
    <div className="bg-secondary prose flex grow flex-col items-center justify-center">
      <h1 className="max-w-160 text-center">
        Maturaprojekt der 5adb zusammen mit dem JMH
      </h1>
      <p className="mb-4 text-center">
        mit ❤️ erstellt von{' '}
        <b>
          <Link href="https://davidkathrein.at">David Kathrein</Link>, Ömer
          Yenidede
        </b>{' '}
        und <b>Luca Raffeiner</b>.
      </p>
      <div className="flex gap-2">
        <Button asChild>
          <Link href="/settings">Einstellungen öffnen</Link>
        </Button>
      </div>
    </div>
  );
}
