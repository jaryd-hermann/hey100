export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="page">
      <a className="brand" href="/">
        <mark>hey100</mark>
        <span>talk to 100 people who want your app</span>
      </a>
      {children}
    </div>
  );
}
