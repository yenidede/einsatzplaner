import SignUpForm from "../../../../features/auth/components/acceptAndRegister-Form";

export default function SignupPage() {
  return (
    <div className="bg-secondary flex grow flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        <SignUpForm />
      </div>
    </div>
  );
}
