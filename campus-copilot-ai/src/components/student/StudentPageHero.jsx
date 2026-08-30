import StudentNotificationBell from "../../pages/student/StudentNotificationBell";

export default function StudentPageHero({
  eyebrow,
  title,
  subtitle,
}) {
  return (
    <section className="relative min-h-[136px] rounded-2xl bg-gradient-to-r from-primary to-primary-container px-5 py-5 text-white md:px-lg md:py-md mb-md">
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl" aria-hidden="true">
        <div className="absolute -right-20 -top-24 h-[280px] w-[280px] rounded-full bg-white/5" />
        <div className="absolute -bottom-32 right-12 h-[260px] w-[260px] rounded-full bg-tertiary-fixed/10" />

        <div className="absolute bottom-5 right-[160px] hidden grid-cols-5 gap-1 opacity-20 sm:grid">
          {Array.from({ length: 15 }).map((_, index) => (
            <div key={index} className="h-1 w-1 rounded-full bg-white" />
          ))}
        </div>
      </div>

      <div className="relative z-10 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="font-label-caps uppercase text-secondary-fixed">
            {eyebrow}
          </div>

          <h1 className="mt-1 font-headline-lg-mobile font-bold text-white md:font-headline-lg">
            {title}
          </h1>

          <p className="mt-1 max-w-3xl font-body-sm text-primary-fixed sm:font-body-md">
            {subtitle}
          </p>
        </div>

        <div className="hidden shrink-0 lg:block">
          <StudentNotificationBell />
        </div>
      </div>
    </section>
  );
}
