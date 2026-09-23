/**
 * Plain panels: `<button data-dialog-open="id">` opens `<dialog id="id">` as a
 * modal. Escape closes it (native), so does its close button (a
 * `<form method="dialog">`) and a click on the backdrop. Focus goes back to
 * the button that opened it, without scrolling the feed.
 */
for (const opener of document.querySelectorAll<HTMLButtonElement>('[data-dialog-open]')) {
  const dialog = document.getElementById(opener.dataset.dialogOpen ?? '');
  if (!(dialog instanceof HTMLDialogElement)) continue;
  opener.addEventListener('click', () => dialog.showModal());
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => opener.focus({ preventScroll: true }));
}
