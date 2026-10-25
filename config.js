/* Public settings only. Keep email addresses, API keys and webhook secrets in Vercel. */
window.KASOKO_CONFIG = Object.freeze({
  brand: 'Kasoko Safaris & Tours',
  bookingEndpoint: '/api/bookings',
  contacts: [
    { label: '0789 515 769', international: '255789515769' },
    { label: '0744 355 769', international: '255744355769' },
    { label: '0762 917 519', international: '255762917519' }
  ]
});
