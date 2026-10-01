(function () {
  var KEY = 'mampi_cookie_notice';
  try {
    if (localStorage.getItem(KEY) === '1') return;
  } catch (err) {
    return;
  }
  var bar = document.createElement('aside');
  bar.className = 'cookie-notice';
  bar.setAttribute('role', 'dialog');
  bar.setAttribute('aria-label', 'Cookie notice');
  var copy = document.createElement('p');
  copy.textContent = 'This site uses zero tracking cookies, zero third-party analytics pixels, and zero data harvesting. Closing this notice stores that choice on this device only.';
  var actions = document.createElement('div');
  actions.className = 'cookie-notice-actions';
  var link = document.createElement('button');
  link.type = 'button';
  link.className = 'legal-text';
  link.setAttribute('data-policy', 'privacy');
  link.style.cssText = 'appearance:none;cursor:pointer;background:transparent;color:inherit;text-decoration:underline;border:none;padding:0;font:inherit;font-weight:600;';
  link.textContent = 'Privacy Policy';
  var button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'Close';
  button.addEventListener('click', function () {
    try { localStorage.setItem(KEY, '1'); } catch (err) {}
    bar.remove();
  });
  actions.appendChild(link);
  actions.appendChild(button);
  bar.appendChild(copy);
  bar.appendChild(actions);
  document.body.appendChild(bar);
})();
