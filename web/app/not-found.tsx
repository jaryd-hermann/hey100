import { OpenApp } from '@/components/OpenApp';

export default function NotFound() {
  return (
    <div className="page">
      <a className="brand" href="/">
        <mark>hey100</mark>
        <span>talk to 100 people who want your app</span>
      </a>
      <h1>Nothing here.</h1>
      <p className="lede">This invite, listing, or group is gone — or the link is wrong.</p>
      <OpenApp path="(tabs)/discover" label="Open hey100" />
    </div>
  );
}
