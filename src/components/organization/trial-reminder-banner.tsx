type TrialReminderBannerProps = {
  message: string;
};

export function TrialReminderBanner({
  message,
}: TrialReminderBannerProps) {
  return (
    <section className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-950">
      <p className="text-sm font-medium">{message}</p>
    </section>
  );
}
