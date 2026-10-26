import { OpenApp } from '@/components/OpenApp';

export default function NotFound() {
  return (
    <>
      <h1>Nothing here.</h1>
      <p className="lede">This invite, listing, or group is gone — or the link is wrong.</p>
      <OpenApp path="(tabs)/discover" label="Open hey100" />
    </>
  );
}
