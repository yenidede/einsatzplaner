import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="bg-secondary flex grow flex-col justify-end p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl mb-8">
        <h1>404 – Diese Seite ist leider nicht ausgestellt</h1>
        <p>
          Die gesuchte Seite konnte nicht gefunden werden. Vielleicht wurde sie
          verschoben, ist gerade im Depot oder existiert nicht mehr. Kein Grund
          zur Sorge: Ihre Verwaltung ist weiterhin sicher und vollständig
          erhalten.
        </p>
        <div className="flex mt-4 gap-2">
          <Button asChild variant="default">
            <Link href="/">Zur Startseite</Link>
          </Button>
        </div>
      </div>
      <Image
        src="https://fgxvzejucaxteqvnhojt.supabase.co/storage/v1/object/public/images/not-found.jpg"
        alt="Frau bestaunt schönes Gemälde in Museum"
        width={3840}
        height={2603}
        className="aspect-video object-cover shrink rounded-lg"
      />
    </div>
  );
}
