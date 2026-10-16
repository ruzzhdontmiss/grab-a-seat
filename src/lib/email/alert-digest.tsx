/**
 * Daily digest email (roadmap §1.5 "daily digest option").
 *
 * One email per fan summarising every price move we detected for them, styled
 * to match the §4 design tokens.
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

export interface DigestItem {
  headline: string;
  matchup: string;
  kickoff: string;
  providerName: string;
  allInCents: number;
  previousCents: number | null;
  isEstimate: boolean;
  gameUrl: string;
}

export interface AlertDigestEmailProps {
  recipientName: string;
  generatedFor: string;
  items: DigestItem[];
}

export function AlertDigestEmail({
  recipientName,
  generatedFor,
  items,
}: AlertDigestEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{`${items.length} price moves for the games you track`}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={topbar}>
            <Text style={brand}>FANTICKET HUB</Text>
            <Text style={brandMeta}>DAILY DIGEST · {generatedFor}</Text>
          </Section>

          <Heading as="h1" style={h1}>
            {items.length} price {items.length === 1 ? "move" : "moves"}
          </Heading>
          <Text style={intro}>
            {recipientName ? `${recipientName}, here is` : "Here is"} what changed on
            the games you track.
          </Text>

          <Section style={card}>
            {items.map((item, index) => (
              <React.Fragment key={`${item.gameUrl}-${index}`}>
                {index > 0 ? <Hr style={hr} /> : null}
                <Text style={itemHeadline}>{item.headline}</Text>
                <Text style={itemMatchup}>{item.matchup}</Text>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <tbody>
                    <tr>
                      <td style={itemMeta}>
                        {item.kickoff} · {item.providerName}
                      </td>
                      <td style={itemPriceCell}>
                        {item.previousCents !== null &&
                        item.previousCents > item.allInCents ? (
                          <span style={strike}>{formatCents(item.previousCents)}</span>
                        ) : null}
                        <span style={price}>{formatCents(item.allInCents)}</span>
                        {item.isEstimate ? <span style={est}> est.</span> : null}
                      </td>
                    </tr>
                  </tbody>
                </table>
                <Text style={itemLink}>
                  <a href={item.gameUrl} style={{ color: VOLT }}>
                    Compare providers →
                  </a>
                </Text>
              </React.Fragment>
            ))}
          </Section>

          <Section style={{ marginTop: "16px" }}>
            <Button href="https://fantickethub.example.com/alerts" style={button}>
              Manage alerts
            </Button>
          </Section>

          <Text style={footer}>
            We may earn a commission on purchases made through our links, at no extra
            cost to you. FanTicket Hub is not affiliated with the NFL, NBA, or any team.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default AlertDigestEmail;

const body: React.CSSProperties = {
  backgroundColor: INK,
  color: TEXT,
  fontFamily: SANS,
  margin: 0,
  padding: "24px 12px",
};

const container: React.CSSProperties = { maxWidth: "520px", margin: "0 auto" };

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
  margin: 0,
};

const brandMeta: React.CSSProperties = {
  color: DIM,
  fontFamily: MONO,
  fontSize: "10px",
  letterSpacing: "0.14em",
  margin: "4px 0 0",
};

const h1: React.CSSProperties = {
  color: TEXT,
  fontFamily: DISPLAY,
  fontSize: "28px",
  fontWeight: 700,
  margin: "0 0 6px",
  textTransform: "uppercase",
};

const intro: React.CSSProperties = { color: DIM, fontSize: "14px", margin: "0 0 16px" };

const card: React.CSSProperties = {
  backgroundColor: SURFACE,
  border: `1px solid ${LINE}`,
  borderRadius: "4px",
  padding: "18px",
};

const hr: React.CSSProperties = {
  borderTop: `1px solid ${LINE}`,
  borderColor: LINE,
  margin: "14px 0",
};

const itemHeadline: React.CSSProperties = {
  color: TEXT,
  fontFamily: DISPLAY,
  fontSize: "19px",
  fontWeight: 700,
  margin: "0 0 2px",
  textTransform: "uppercase",
};

const itemMatchup: React.CSSProperties = {
  color: TEXT,
  fontSize: "14px",
  margin: "0 0 6px",
};

const itemMeta: React.CSSProperties = { color: DIM, fontSize: "12px" };

const itemPriceCell: React.CSSProperties = { textAlign: "right" };

const price: React.CSSProperties = {
  color: VOLT,
  fontFamily: MONO,
  fontSize: "20px",
  fontWeight: 700,
};

const strike: React.CSSProperties = {
  color: DIM,
  fontFamily: MONO,
  fontSize: "13px",
  marginRight: "8px",
  textDecoration: "line-through",
};

const est: React.CSSProperties = { color: DIM, fontFamily: MONO, fontSize: "11px" };

const itemLink: React.CSSProperties = { fontSize: "12px", margin: "8px 0 0" };

const button: React.CSSProperties = {
  backgroundColor: VOLT,
  borderRadius: "4px",
  color: INK,
  display: "inline-block",
  fontSize: "13px",
  fontWeight: 500,
  letterSpacing: "0.08em",
  padding: "10px 18px",
  textDecoration: "none",
  textTransform: "uppercase",
};

const footer: React.CSSProperties = {
  color: DIM,
  fontSize: "11px",
  lineHeight: 1.5,
  marginTop: "18px",
};
