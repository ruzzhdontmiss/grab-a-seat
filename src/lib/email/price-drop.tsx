/**
 * Price-drop email (roadmap §1.5). React Email template styled to match the §4
 * design system: dark surface, 1px borders, mono prices, ONE volt CTA.
 */

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

import { formatCents } from "@/lib/utils";

const INK = "#0B0C0E";
const SURFACE = "#121417";
const LINE = "#23262B";
const TEXT = "#F2F3F5";
const DIM = "#9BA1A9";
const VOLT = "#C8FF3D";

const MONO = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace";
const SANS = "Archivo, Helvetica, Arial, sans-serif";
const DISPLAY = "'Barlow Condensed', 'Arial Narrow', Arial, sans-serif";

export interface PriceDropEmailProps {
  /** Short headline, e.g. "Price dropped 18%". */
  headline: string;
  matchup: string;
  league: "nfl" | "nba";
  venue: string | null;
  kickoff: string;
  providerName: string;
  allInCents: number;
  previousCents: number | null;
  isEstimate: boolean;
  ctaUrl: string;
  ctaLabel: string;
  gameUrl: string;
}

export function PriceDropEmail({
  headline,
  matchup,
  league,
  venue,
  kickoff,
  providerName,
  allInCents,
  previousCents,
  isEstimate,
  ctaUrl,
  ctaLabel,
  gameUrl,
}: PriceDropEmailProps) {
  const dropped =
    previousCents !== null && previousCents > allInCents ? previousCents : null;

  return (
    <Html>
      <Head />
      <Preview>{`${headline} — ${matchup}`}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={topbar}>
            <Text style={brand}>FANTICKET HUB</Text>
            <Text style={brandMeta}>ALL-IN PRICE ALERT</Text>
          </Section>

          <Section style={card}>
            <Text style={leagueLine}>
              {league.toUpperCase()} · {kickoff}
            </Text>
            <Heading as="h1" style={h1}>
              {headline}
            </Heading>
            <Text style={matchupText}>{matchup}</Text>
            {venue ? <Text style={meta}>{venue}</Text> : null}

            <Hr style={hr} />

            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                <tr>
                  <td style={priceLabel}>All-in price</td>
                  <td style={priceCell}>
                    {dropped !== null ? (
                      <span style={strike}>{formatCents(dropped)}</span>
                    ) : null}
                    <span style={price}>{formatCents(allInCents)}</span>
                    {isEstimate ? <span style={est}> est.</span> : null}
                  </td>
                </tr>
                <tr>
                  <td style={priceLabel}>Provider</td>
                  <td style={priceCellDim}>{providerName}</td>
                </tr>
              </tbody>
            </table>

            <Section style={{ marginTop: "20px" }}>
              <Button href={ctaUrl} style={button}>
                {ctaLabel}
              </Button>
            </Section>

            <Text style={note}>
              {isEstimate
                ? "“est.” marks a total that includes estimated fees. Final price is set by the provider at checkout."
                : "All-in price includes fees where the provider reports them."}
            </Text>
          </Section>

          <Section>
            <Text style={footerLink}>
              <a href={gameUrl} style={{ color: DIM }}>
                See the full provider comparison →
              </a>
            </Text>
            <Text style={footer}>
              We may earn a commission on purchases made through our links, at no extra
              cost to you. FanTicket Hub is not affiliated with the NFL, NBA, or any
              team.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default PriceDropEmail;

const body: React.CSSProperties = {
  backgroundColor: INK,
  color: TEXT,
  fontFamily: SANS,
  margin: 0,
  padding: "24px 12px",
};

const container: React.CSSProperties = {
  maxWidth: "520px",
  margin: "0 auto",
};

const topbar: React.CSSProperties = {
  borderBottom: `1px solid ${LINE}`,
  paddingBottom: "10px",
  marginBottom: "16px",
};

const brand: React.CSSProperties = {
  color: TEXT,
  fontFamily: DISPLAY,
  fontSize: "18px",
  fontWeight: 700,
  letterSpacing: "0.02em",
  margin: 0,
};

const brandMeta: React.CSSProperties = {
  color: DIM,
  fontFamily: MONO,
  fontSize: "10px",
  letterSpacing: "0.14em",
  margin: "4px 0 0",
};

const card: React.CSSProperties = {
  backgroundColor: SURFACE,
  border: `1px solid ${LINE}`,
  borderRadius: "4px",
  padding: "20px",
};

const leagueLine: React.CSSProperties = {
  color: DIM,
  fontFamily: MONO,
  fontSize: "11px",
  letterSpacing: "0.12em",
  margin: 0,
};

const h1: React.CSSProperties = {
  color: TEXT,
  fontFamily: DISPLAY,
  fontSize: "30px",
  fontWeight: 700,
  letterSpacing: "-0.01em",
  lineHeight: 1.02,
  margin: "10px 0 8px",
  textTransform: "uppercase",
};

const matchupText: React.CSSProperties = {
  color: TEXT,
  fontSize: "15px",
  margin: 0,
};

const meta: React.CSSProperties = {
  color: DIM,
  fontSize: "13px",
  margin: "4px 0 0",
};

const hr: React.CSSProperties = {
  borderColor: LINE,
  borderTop: `1px solid ${LINE}`,
  margin: "18px 0",
};

const priceLabel: React.CSSProperties = {
  color: DIM,
  fontSize: "11px",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  padding: "4px 0",
};

const priceCell: React.CSSProperties = {
  textAlign: "right",
  padding: "4px 0",
};

const priceCellDim: React.CSSProperties = {
  color: TEXT,
  textAlign: "right",
  fontSize: "14px",
  padding: "4px 0",
};

const price: React.CSSProperties = {
  color: VOLT,
  fontFamily: MONO,
  fontSize: "24px",
  fontWeight: 700,
};

const strike: React.CSSProperties = {
  color: DIM,
  fontFamily: MONO,
  fontSize: "14px",
  marginRight: "10px",
  textDecoration: "line-through",
};

const est: React.CSSProperties = {
  color: DIM,
  fontFamily: MONO,
  fontSize: "12px",
};

const button: React.CSSProperties = {
  backgroundColor: VOLT,
  borderRadius: "4px",
  color: INK,
  display: "inline-block",
  fontFamily: SANS,
  fontSize: "13px",
  fontWeight: 500,
  letterSpacing: "0.08em",
  padding: "12px 20px",
  textDecoration: "none",
  textTransform: "uppercase",
};

const note: React.CSSProperties = {
  color: DIM,
  fontSize: "12px",
  lineHeight: 1.5,
  marginTop: "16px",
};

const footerLink: React.CSSProperties = {
  fontSize: "13px",
  marginTop: "18px",
};

const footer: React.CSSProperties = {
  color: DIM,
  fontSize: "11px",
  lineHeight: 1.5,
  marginTop: "10px",
};
