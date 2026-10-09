/**
 * PBS Editor Launcher — opens the standalone PBS Editor app
 * (https://lacabrapalmonte.github.io/PBS-Editor/) on this project.
 *
 * Mods run sandboxed: no spawning processes, no reading paths outside the
 * mod's own folder and the project folder (see ctx.fs). So "is PBS Editor
 * installed" can't be answered directly from here — it's delegated to
 * Windows: installing PBS Editor registers a "pbseditor://" URL protocol
 * (registered by the PBS Editor installer, per user, no admin). Opening
 * that URL launches PBS Editor with this project pre-loaded when it's
 * installed.
 *
 * IMPORTANT: ctx.ui.openUrl() does NOT get handed the "pbseditor://" URI
 * directly — it goes through an intermediate redirect page instead
 * (see REDIRECT_URL), which performs the navigation from an already
 * loaded page and so reliably triggers the browser's native "open PBS
 * Editor?" permission prompt.
 *
 * ctx.ui.openUrl() launches explorer.exe with the URL as its argument, and
 * explorer treats "=" as a separator for its own switches: any URL with
 * "=" in it (e.g. "?path=...", or "pbseditor://open?path=...") opens File
 * Explorer on Documents instead of the browser. Confirmed empirically
 * against a local server: "page#path=X" never reached the browser,
 * "page#X" did. So the project path goes in the fragment, with no "=".
 *
 * When PBS Editor ISN'T installed, Windows does NOT reliably fail/reject
 * for an unregistered custom protocol (confirmed empirically: ShellExecute
 * on an unregistered scheme silently falls through to some other default
 * handler instead of erroring — it does not throw). So neither a rejected
 * promise from ctx.ui.openUrl() nor anything on the redirect page can be
 * trusted as "not installed", and this mod does NOT try to auto-detect
 * absence. Instead it always offers a manual "Download" action alongside
 * the launch attempt.
 */

const REDIRECT_URL = "https://lacabrapalmonte.github.io/PBS-Editor/open.html";
const DOWNLOAD_URL = "https://lacabrapalmonte.github.io/PBS-Editor/";

import es from "./locales/es.js";

export function activate(ctx) {
  ctx.i18n.addTranslations("es", es);

  ctx.menu.registerMenuItem({
    menu: "Mods",
    label: ctx.i18n.t("Open PBS Editor"),
    icon: "code",
    handler: () => openPBSEditor(ctx),
  });
}

async function openPBSEditor(ctx) {
  const gameRoot = ctx.editor.gameRoot();
  if (!gameRoot) {
    ctx.ui.showToast({ message: ctx.i18n.t("Open a project first."), level: "warn" });
    return;
  }

  // Path goes in the fragment, NOT as "?path=": openUrl() hands the URL to
  // explorer.exe, which treats "=" as a separator for its own switches —
  // any URL containing "=" opened File Explorer on Documents instead of the
  // browser (confirmed empirically). encodeURIComponent already escapes any
  // "=" or "," inside the path itself. The "?<timestamp>" (a bare query, no
  // "=", which explorer.exe passes through fine) makes every click a fresh
  // URL, so a browser that cached an older open.html (GitHub Pages sends
  // max-age=600) can't serve it instead of the current one.
  const uri = REDIRECT_URL + "?" + Date.now() + "#" + encodeURIComponent(gameRoot);

  try {
    await ctx.ui.openUrl(uri);
  } catch (e) {
    ctx.log.warn(`PBS Editor Launcher: openUrl() rejected (${e}).`);
  }

  ctx.ui.showToast({
    message: ctx.i18n.t("Your browser may ask for permission to open PBS Editor — accept to continue."),
    level: "info",
    durationMs: 10000,
    action: {
      label: ctx.i18n.t("Download PBS Editor"),
      onClick: () => ctx.ui.openUrl(DOWNLOAD_URL),
    },
  });
}

export function deactivate() {}
