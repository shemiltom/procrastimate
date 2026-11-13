// Shared responses for pages and JSON clients. The messages here are short and
// do not repeat database or filesystem detail.

export function sendClientError(req, res, status, message) {
  if (req.path.startsWith('/api/')) {
    return res.status(status).json({ error: status === 404 ? 'Not found' : message });
  }
  return res.status(status).type('text').send(message);
}

export function notFoundHandler(req, res) {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  return res.status(404).render('errors/404', { title: 'Page not found' });
}

export function errorHandler(error, req, res, next) {
  const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 500
    ? error.status
    : 500;
  console.error('Request failed with status', status, 'for', req.method, req.path);
  if (res.headersSent) return next(error);
  if (status === 404) {
    return res.status(404).render('errors/404', { title: 'Page not found' });
  }
  if (status === 500) {
    return res.status(500).render('errors/500', { title: 'Something went wrong' });
  }
  return res.status(status).type('text').send('The request could not be completed.');
}
