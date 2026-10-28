// The template seed's redirections (strapi/LaunchPad strapi/data export), as
// Strapi's `redirections` collection returns them: what next.config.ts
// redirects by before a Strapi project is connected.
import redirections from '../../sample/strapi/redirections.json';

export const sampleRedirections: { source: string; destination: string }[] = redirections;
