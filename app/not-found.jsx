// app/not-found.jsx

import ModuleComingSoon from "./ModuleComingSoon";

export default function NotFound() {
  return (
    <ModuleComingSoon
      moduleName="This module"
      description="We couldn't find what you were looking for. It may have moved, or the module hasn't shipped yet — here's what's already available."
    />
  );
}