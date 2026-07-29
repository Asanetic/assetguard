// app/registry.js
//
// Flattens appConfigs/moduleMenu.js (parents + children) into a flat list
// of { key, name, group, href, icon, color } for ModuleComingSoon.
// Nothing here is hand-maintained — add modules in moduleMenu.js and they
// show up here automatically, whether there are 9 or 90 of them.

import moduleMenu from "./appConfigs/Modulemenu";

function flattenModules(menu) {
  const flat = [];

  for (const item of menu) {
    if (item.children?.length) {
      for (const child of item.children) {
        flat.push({
          key: `${item.key}::${child.href}`,
          name: child.label,
          group: item.label,
          href: child.href,
          icon: item.icon,
          color: item.color,
        });
      }
    } else if (item.href) {
      flat.push({
        key: item.key,
        name: item.label,
        group: item.label,
        href: item.href,
        icon: item.icon,
        color: item.color,
      });
    }
  }

  return flat;
}

export const availableModules = flattenModules(moduleMenu);
export default availableModules;