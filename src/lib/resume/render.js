/**
 * Server-side PDF generation entry point. Turns a stored ResumeBuilder blob +
 * profile id into a PDF Buffer plus a suggested download filename.
 *
 * Node runtime only (imports @react-pdf/renderer, which is server-external —
 * see next.config serverExternalPackages). Keep this module out of any Edge
 * route. resolveProfile/schema are pure and may be imported anywhere.
 */

import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { ResumeDocument } from './template.js';
import { resolveProfile, resumeFilename } from './resolveProfile.js';

/**
 * @param {object} rawData  Stored ResumeBuilder blob.
 * @param {string} [profileId]  Profile to render (defaults to the active one).
 * @returns {Promise<{ buffer: Buffer, filename: string, model: object }>}
 */
export async function renderResumePdf(rawData, profileId) {
  const model = resolveProfile(rawData, profileId);
  const buffer = await renderToBuffer(<ResumeDocument model={model} />);
  return { buffer, filename: resumeFilename(model), model };
}
