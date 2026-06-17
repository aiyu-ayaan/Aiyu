/**
 * "Classic" résumé PDF template — a single-column academic layout mirroring the
 * source LaTeX resume (centered small-caps name, ruled section headers,
 * title-left / date-right rows, en-dash bullets).
 *
 * Uses @react-pdf/renderer's built-in Times family so NO font files need to ship
 * in the read-only container. Consumes the flat model from resolveProfile().
 */

import React from 'react';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';

const COLORS = { ink: '#1a1a1a', rule: '#000000', muted: '#333333' };

const styles = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingBottom: 36,
    paddingHorizontal: 44,
    fontFamily: 'Times-Roman',
    fontSize: 9.5,
    color: COLORS.ink,
    lineHeight: 1.35,
  },
  // Header
  name: { fontFamily: 'Times-Bold', fontSize: 20, textAlign: 'center', letterSpacing: 1.5, textTransform: 'uppercase' },
  tagline: { fontSize: 10.5, textAlign: 'center', marginTop: 2 },
  location: { fontSize: 9.5, textAlign: 'center', marginTop: 1 },
  contact: { fontSize: 9, textAlign: 'center', marginTop: 3, color: COLORS.muted },
  // Sections
  sectionTitle: {
    fontFamily: 'Times-Bold',
    fontSize: 11,
    textTransform: 'uppercase',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.rule,
    paddingBottom: 2,
    marginTop: 11,
    marginBottom: 5,
  },
  summary: { textAlign: 'justify', lineHeight: 1.4 },
  // Item rows
  item: { marginBottom: 6 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  primaryLeft: { fontFamily: 'Times-Bold', fontSize: 10.5 },
  primaryRight: { fontFamily: 'Times-Bold', fontSize: 9.5 },
  secondaryLeft: { fontFamily: 'Times-Italic', fontSize: 9.5 },
  secondaryRight: { fontFamily: 'Times-Italic', fontSize: 9.5 },
  projectStack: { fontFamily: 'Times-Italic', fontSize: 9.5 },
  // Bullets
  bulletRow: { flexDirection: 'row', marginTop: 1.5, paddingLeft: 10 },
  bulletGlyph: { width: 10 },
  bulletText: { flex: 1, textAlign: 'justify' },
  // Skills
  skillRow: { marginBottom: 1.5 },
  skillCategory: { fontFamily: 'Times-Bold' },
});

function dateRange(start, end) {
  const s = (start || '').trim();
  const e = (end || '').trim();
  if (s && e) return `${s} – ${e}`;
  return e || s || '';
}

function Bullets({ bullets }) {
  if (!bullets || bullets.length === 0) return null;
  return (
    <View>
      {bullets.map((text, i) => (
        <View key={i} style={styles.bulletRow} wrap={false}>
          <Text style={styles.bulletGlyph}>{'–'}</Text>
          <Text style={styles.bulletText}>{text}</Text>
        </View>
      ))}
    </View>
  );
}

function ExperienceSection({ items }) {
  return items.map((it, i) => (
    <View key={i} style={styles.item} wrap={false}>
      <View style={styles.rowBetween}>
        <Text style={styles.primaryLeft}>{it.company}</Text>
        <Text style={styles.primaryRight}>{dateRange(it.start, it.end)}</Text>
      </View>
      <View style={styles.rowBetween}>
        <Text style={styles.secondaryLeft}>{it.role}</Text>
        {it.location ? <Text style={styles.secondaryRight}>{it.location}</Text> : <Text />}
      </View>
      <Bullets bullets={it.bullets} />
    </View>
  ));
}

function ProjectsSection({ items }) {
  return items.map((it, i) => (
    <View key={i} style={styles.item} wrap={false}>
      <View style={styles.rowBetween}>
        <Text>
          <Text style={styles.primaryLeft}>{it.name}</Text>
          {it.stack ? <Text style={styles.projectStack}>{`  |  ${it.stack}`}</Text> : null}
        </Text>
        <Text style={styles.primaryRight}>{dateRange(it.start, it.end)}</Text>
      </View>
      <Bullets bullets={it.bullets} />
    </View>
  ));
}

function EducationSection({ items }) {
  return items.map((it, i) => (
    <View key={i} style={styles.item} wrap={false}>
      <View style={styles.rowBetween}>
        <Text style={styles.primaryLeft}>{it.institution}</Text>
        <Text style={styles.primaryRight}>{dateRange(it.start, it.end)}</Text>
      </View>
      <View style={styles.rowBetween}>
        <Text style={styles.secondaryLeft}>{it.degree}</Text>
        {it.note ? <Text style={styles.secondaryRight}>{it.note}</Text> : <Text />}
      </View>
    </View>
  ));
}

function SkillsSection({ items }) {
  return (
    <View>
      {items.map((it, i) => (
        <Text key={i} style={styles.skillRow}>
          <Text style={styles.skillCategory}>{it.category}: </Text>
          {it.items}
        </Text>
      ))}
    </View>
  );
}

function CertificationsSection({ items }) {
  return items.map((it, i) => (
    <View key={i} style={styles.item} wrap={false}>
      <View style={styles.rowBetween}>
        <Text style={styles.primaryLeft}>{it.name}</Text>
        {it.date ? <Text style={styles.primaryRight}>{it.date}</Text> : <Text />}
      </View>
      {it.issuer ? <Text style={styles.secondaryLeft}>{it.issuer}</Text> : null}
    </View>
  ));
}

function SectionBody({ section }) {
  switch (section.kind) {
    case 'summary':
      return <Text style={styles.summary}>{section.text}</Text>;
    case 'experience':
      return <ExperienceSection items={section.items} />;
    case 'projects':
      return <ProjectsSection items={section.items} />;
    case 'education':
      return <EducationSection items={section.items} />;
    case 'skills':
      return <SkillsSection items={section.items} />;
    case 'certifications':
      return <CertificationsSection items={section.items} />;
    default:
      return null;
  }
}

function ContactLine({ basics }) {
  const parts = [basics.phone, basics.email, basics.linkedin, basics.github, basics.website]
    .map((p) => (p || '').trim())
    .filter(Boolean);
  if (parts.length === 0) return null;
  return <Text style={styles.contact}>{parts.join('   |   ')}</Text>;
}

/**
 * @param {{ model: import('./resolveProfile.js').ResumeModel }} props
 */
export function ResumeDocument({ model }) {
  const { basics, tagline, sections } = model;
  return (
    <Document
      title={`${basics.name} — Resume`}
      author={basics.name}
      creator="Resume Tailoring Hub"
    >
      <Page size="LETTER" style={styles.page}>
        <View>
          <Text style={styles.name}>{basics.name}</Text>
          {tagline ? <Text style={styles.tagline}>{tagline}</Text> : null}
          {basics.location ? <Text style={styles.location}>{basics.location}</Text> : null}
          <ContactLine basics={basics} />
        </View>

        {sections.map((section) => (
          <View key={section.key}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <SectionBody section={section} />
          </View>
        ))}
      </Page>
    </Document>
  );
}
