export function Logo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.png"
      alt="Aclipse Hub logo"
      className={`${className} object-cover`}
    />
  );
}
