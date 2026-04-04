import Image from 'next/image';

export default function SignupPage() {
  return (
    <div className="bg-secondary flex grow flex-col justify-end p-6 md:p-10">
      <div className="mb-8 w-full max-w-sm md:max-w-4xl">
        <h1>Registrieren nur noch via persönlichen Einladungslink!</h1>
        <p>
          Bitte wenden Sie sich an einen Administrator, um einen Einladungslink
          zu erhalten.
        </p>
      </div>
      <Image
        src="https://fgxvzejucaxteqvnhojt.supabase.co/storage/v1/object/public/images/signup.jpg"
        alt="Sehr schönes Museum mit altem Gemälde"
        width={3840}
        height={2418}
        className="aspect-video shrink rounded-lg object-cover"
      />
    </div>
  );
}
