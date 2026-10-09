# PBS Editor Launcher

A Maker Studio mod that adds **Mods → Open PBS Editor**: opens the standalone
[PBS Editor](https://lacabrapalmonte.github.io/PBS-Editor/) desktop app by
LaCabraPalMonte on the project currently open in Maker Studio, with the project
already loaded. Every click also shows a toast with a **Download PBS Editor**
button, in case you don't have it yet.

> This mod is only a launcher for that separate Windows app. It is **not** the
> in-editor "PBS Editor" mod by Toskan4134 (`com.toskan4134.pbs-editor`), and
> it doesn't edit any files itself.

## Install

Maker Studio → **Mods → Mod Manager → Marketplace** → *PBS Editor Launcher* →
**Install**. Then install [PBS Editor](https://lacabrapalmonte.github.io/PBS-Editor/)
itself (Windows, per-user installer, no admin needed).

The only permission it asks for is `ui.toasts` (the reminder toast with the
download button). It reads nothing from disk and writes nothing; the only
network access is the `lacabrapalmonte.github.io` page it opens in your
browser, which Maker Studio asks you to confirm.

## How it works

Maker Studio mods run sandboxed — no launching processes, no reading paths
outside the mod's own folder or the project folder. So this mod can't check
whether `PBS_Editor_Launcher.exe` exists on disk, and can't run it directly.

Instead, installing PBS Editor registers a `pbseditor://` URL protocol with
Windows (per user, under `HKCU\Software\Classes\pbseditor`). If PBS Editor is
installed, opening that URL launches it with the project pre-selected
(its launcher parses the `path` query param and auto-starts — no
folder picker, no extra click).

**The mod does NOT call `ctx.ui.openUrl()` with `pbseditor://` directly.**
Confirmed empirically: `ctx.ui.openUrl()` opens its target in the system's
default browser by launching the browser executable with the URL as a
command-line argument, and Chromium-based browsers (Edge, Chrome...) do
**not** resolve a custom protocol scheme when it arrives that way — only
when a page that's *already loaded* navigates to it for real
(`location.href`, or an actual click). Passing `pbseditor://...` straight to
`openUrl()` reproducibly opened File Explorer on the user's Documents folder
instead of PBS Editor.

So instead, the mod opens a small redirect page hosted alongside the PBS
Editor website —
[`open.html`](https://lacabrapalmonte.github.io/PBS-Editor/open.html)
(source in the [PBS-Editor](https://github.com/LaCabraPalMonte/PBS-Editor/blob/main/docs/open.html)
repo) — passing the project path in
the URL fragment: `open.html?<timestamp>#<encodeURIComponent(path)>`. The
bare `?<timestamp>` (no `=`) makes each click a fresh URL so a browser can't
serve a cached older `open.html` (GitHub Pages sends `max-age=600`).

**The URL must not contain `=`.** `ctx.ui.openUrl()` hands the URL to
`explorer.exe`, which treats `=` as a separator for its own switches: any
URL with `=` (`?path=...`, `#path=...`, `pbseditor://open?path=...`) opens
File Explorer on Documents instead of the browser. Confirmed against a local
server — `page#path=X` never reached the browser, `page#X` did. That page is a real loaded page: it navigates to
`pbseditor://open?path=...` itself (automatically on load, plus a visible
"Abrir PBS Editor" button as a guaranteed-user-gesture fallback in case the
browser blocks the automatic attempt), which reliably triggers the browser's
native "open PBS Editor?" permission prompt the same way links like
`zoommtg://` or `slack://` do from any other website.

**There is still no reliable "not installed" detection.** Confirmed
empirically: Windows does not throw/reject for an *unregistered* custom
protocol — it silently falls through to some other default handler instead
of erroring. So this mod doesn't try to branch on success/failure. Every
click shows a toast reminding the user their browser may ask for permission,
with a manual **Download PBS Editor** button alongside — harmless if PBS
Editor did open, a one-click fallback if it didn't (the redirect page itself
also has its own always-visible download link).

Requires PBS Editor **1.1.3+** (earlier installs didn't register the
`pbseditor://` protocol — reinstalling is the only way to pick it up).
