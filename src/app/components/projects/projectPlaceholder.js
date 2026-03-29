export const getProjectInitials = (name) => {
  const words = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return 'PR';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
};

export const getPlaceholderGradient = (name) => {
  const gradients = [
    'linear-gradient(135deg, color-mix(in srgb, var(--accent-cyan) 22%, var(--bg-surface)), color-mix(in srgb, var(--accent-purple) 18%, var(--bg-secondary)))',
    'linear-gradient(135deg, color-mix(in srgb, var(--accent-orange) 22%, var(--bg-surface)), color-mix(in srgb, var(--accent-pink) 18%, var(--bg-secondary)))',
    'linear-gradient(135deg, color-mix(in srgb, var(--accent-purple) 24%, var(--bg-surface)), color-mix(in srgb, var(--accent-cyan) 16%, var(--bg-secondary)))',
    'linear-gradient(135deg, color-mix(in srgb, var(--accent-pink) 22%, var(--bg-surface)), color-mix(in srgb, var(--accent-orange) 18%, var(--bg-secondary)))',
  ];

  const safeName = String(name || '');
  const hash = Array.from(safeName).reduce((accumulator, char) => accumulator + char.charCodeAt(0), 0);
  return gradients[hash % gradients.length];
};

