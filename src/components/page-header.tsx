export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <header className="pt-safe">
      <div className="flex items-end justify-between gap-4 px-4 pb-4 pt-6 md:px-8 md:pt-10">
        <div className="min-w-0">
          <h1 className="title-large text-balance">{title}</h1>
          {subtitle && <p className="footnote mt-1 text-ink-2">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </header>
  );
}

export function Section({
  title,
  action,
  children,
  className = "",
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`px-4 md:px-8 ${className}`}>
      {(title || action) && (
        <div className="mb-3 mt-8 flex items-baseline justify-between gap-3">
          {title && <h2 className="title-2">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
